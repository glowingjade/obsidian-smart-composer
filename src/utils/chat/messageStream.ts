import { v4 as uuidv4 } from 'uuid'

import { BaseLLMProvider } from '../../core/llm/base'
import {
  ChatAssistantMessage,
  ChatMessage,
  ChatToolMessage,
  ToolCallRequest,
} from '../../types/chat'
import { ChatModel } from '../../types/chat-model.types'
import { RequestTool } from '../../types/llm/request'
import {
  Annotation,
  LLMResponseStreaming,
  ToolCallDelta,
} from '../../types/llm/response'
import { LLMProvider } from '../../types/provider.types'
import { MCPManager } from '../mcp'

import { fetchAnnotationTitles } from './fetch-annotation-titles'
import { PromptGenerator } from './promptGenerator'

export type MessageStreamParams = {
  providerClient: BaseLLMProvider<LLMProvider>
  model: ChatModel
  messages: ChatMessage[]
  promptGenerator: PromptGenerator
  mcpManager: MCPManager
  abortSignal?: AbortSignal
}

export class MessageStream {
  private providerClient: BaseLLMProvider<LLMProvider>
  private model: ChatModel
  private promptGenerator: PromptGenerator
  private mcpManager: MCPManager
  private abortSignal?: AbortSignal

  private messages: ChatMessage[]
  private subscribers: ((messages: ChatMessage[]) => void)[] = []
  private maxAutoIterations = 5

  constructor(params: MessageStreamParams) {
    this.providerClient = params.providerClient
    this.model = params.model
    this.promptGenerator = params.promptGenerator
    this.mcpManager = params.mcpManager
    this.abortSignal = params.abortSignal
    this.messages = params.messages
  }

  public subscribe(callback: (messages: ChatMessage[]) => void) {
    this.subscribers.push(callback)
  }

  public async run() {
    for (let i = 0; i < this.maxAutoIterations; i++) {
      const { toolCallRequests } = await this.runSingleStream()
      if (toolCallRequests.length === 0) {
        return
      }

      // FIXME: Currently, assume that all tool calls are approved
      const toolMessages: ChatToolMessage[] = toolCallRequests.map(
        (toolCall) => ({
          role: 'tool' as const,
          id: uuidv4(),
          request: toolCall,
          response: {
            status: 'pending_execution' as const,
          },
        }),
      )

      this.updateMessages((messages) => [...messages, ...toolMessages])

      let aborted = false
      await Promise.all(
        toolMessages.map(async (toolMessage) => {
          const result = await this.mcpManager.callTool({
            name: toolMessage.request.name,
            args: toolMessage.request.arguments,
            id: toolMessage.id,
            signal: this.abortSignal,
          })
          if (result.status === 'aborted') {
            aborted = true
          }
          this.updateMessages((messages) =>
            messages.map((message) =>
              message.id === toolMessage.id && message.role === 'tool'
                ? {
                    ...message,
                    response: result,
                  }
                : message,
            ),
          )
        }),
      )
      if (aborted) {
        // Stop auto iteration if any tool call was aborted
        return
      }
    }
  }

  private async runSingleStream(): Promise<{
    toolCallRequests: ToolCallRequest[]
  }> {
    const { requestMessages, updatedMessages } =
      await this.promptGenerator.generateRequestMessages({
        messages: this.messages,
      })
    if (updatedMessages) {
      this.messages = updatedMessages
    }

    const tools: RequestTool[] = (await this.mcpManager.listTools()).map(
      (tool) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
        },
      }),
    )

    const stream = await this.providerClient.streamResponse(
      this.model,
      {
        model: this.model.model,
        messages: requestMessages,
        tools,
        stream: true,
      },
      {
        signal: this.abortSignal,
      },
    )

    // Create a new assistant message for the response if it doesn't exist
    if (this.messages.at(-1)?.role !== 'assistant') {
      this.messages.push({
        role: 'assistant',
        content: '',
        id: uuidv4(),
      })
    }
    const responseMessageId = (this.messages.at(-1) as ChatAssistantMessage).id
    const responseToolCalls: Record<number, ToolCallDelta> = {}
    for await (const chunk of stream) {
      this.processChunk(chunk, responseMessageId, responseToolCalls)
    }
    const toolCallRequests: ToolCallRequest[] = Object.values(responseToolCalls)
      .map((toolCall) => {
        // filter out invalid tool calls without a name
        if (!toolCall.function?.name) {
          return null
        }
        return {
          id: toolCall.id ?? uuidv4(),
          name: toolCall.function.name,
          arguments: toolCall.function.arguments,
        }
      })
      .filter((toolCall) => toolCall !== null)

    this.updateMessages((messages) =>
      messages.map((message) =>
        message.id === responseMessageId && message.role === 'assistant'
          ? {
              ...message,
              toolCalls:
                toolCallRequests.length > 0 ? toolCallRequests : undefined,
            }
          : message,
      ),
    )
    return {
      toolCallRequests: toolCallRequests,
    }
  }

  private processChunk(
    chunk: LLMResponseStreaming,
    responseMessageId: string,
    responseToolCalls: Record<number, ToolCallDelta>,
  ) {
    const content = chunk.choices[0]?.delta?.content ?? ''
    const reasoning = chunk.choices[0]?.delta?.reasoning
    const toolCalls = chunk.choices[0]?.delta?.tool_calls
    const annotations = chunk.choices[0]?.delta?.annotations

    if (toolCalls) {
      for (const toolCall of toolCalls) {
        const { index } = toolCall

        if (!responseToolCalls[index]) {
          responseToolCalls[index] = toolCall
        } else {
          responseToolCalls[index].id =
            responseToolCalls[index].id ?? toolCall.id
          responseToolCalls[index].type =
            responseToolCalls[index].type ?? toolCall.type
          if (responseToolCalls[index].function || toolCall.function) {
            responseToolCalls[index].function = {
              name:
                responseToolCalls[index].function?.name ??
                toolCall.function?.name,
              arguments:
                (responseToolCalls[index].function?.arguments ?? '') +
                (toolCall.function?.arguments ?? ''),
            }
          }
        }
      }
    }

    if (annotations) {
      // For annotations with empty titles, fetch the title of the URL and update the chat messages
      fetchAnnotationTitles(annotations, (url, title) => {
        this.updateMessages((messages) =>
          messages.map((message) =>
            message.id === responseMessageId && message.role === 'assistant'
              ? {
                  ...message,
                  annotations: message.annotations?.map((a) =>
                    a.type === 'url_citation' && a.url_citation.url === url
                      ? {
                          ...a,
                          url_citation: {
                            ...a.url_citation,
                            title: title ?? undefined,
                          },
                        }
                      : a,
                  ),
                }
              : message,
          ),
        )
      })
    }

    this.updateMessages((messages) =>
      messages.map((message) =>
        message.id === responseMessageId && message.role === 'assistant'
          ? {
              ...message,
              content: message.content + content,
              reasoning: reasoning
                ? (message.reasoning ?? '') + reasoning
                : message.reasoning,
              annotations: this.appendAnnotations(
                message.annotations,
                annotations,
              ),
              metadata: {
                ...message.metadata,
                usage: chunk.usage ?? message.metadata?.usage,
              },
            }
          : message,
      ),
    )
  }

  private updateMessages(
    updaterFunction: (messages: ChatMessage[]) => ChatMessage[],
  ) {
    this.messages = updaterFunction(this.messages)
    this.notifySubscribers(this.messages)
  }

  private notifySubscribers(messages: ChatMessage[]) {
    this.subscribers.forEach((callback) => callback(messages))
  }

  private appendAnnotations = (
    prevAnnotations?: Annotation[],
    newAnnotations?: Annotation[],
  ): Annotation[] | undefined => {
    if (!prevAnnotations) return newAnnotations
    if (!newAnnotations) return prevAnnotations

    const mergedAnnotations = [...prevAnnotations]
    for (const newAnnotation of newAnnotations) {
      if (
        !mergedAnnotations.find(
          (annotation) =>
            annotation.url_citation.url === newAnnotation.url_citation.url,
        )
      ) {
        mergedAnnotations.push(newAnnotation)
      }
    }
    return mergedAnnotations
  }
}
