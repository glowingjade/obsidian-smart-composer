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

export type ResponseGeneratorParams = {
  providerClient: BaseLLMProvider<LLMProvider>
  model: ChatModel
  messages: ChatMessage[]
  promptGenerator: PromptGenerator
  mcpManager: MCPManager
  abortSignal?: AbortSignal
}

export class ResponseGenerator {
  private readonly providerClient: BaseLLMProvider<LLMProvider>
  private readonly model: ChatModel
  private readonly promptGenerator: PromptGenerator
  private readonly mcpManager: MCPManager
  private readonly abortSignal?: AbortSignal
  private readonly receivedMessages: ChatMessage[]
  private readonly maxAutoIterations = 5

  private responseMessages: ChatMessage[] = [] // Response messages that are generated after the initial messages
  private subscribers: ((messages: ChatMessage[]) => void)[] = []

  constructor(params: ResponseGeneratorParams) {
    this.providerClient = params.providerClient
    this.model = params.model
    this.receivedMessages = params.messages
    this.promptGenerator = params.promptGenerator
    this.mcpManager = params.mcpManager
    this.abortSignal = params.abortSignal
  }

  public subscribe(callback: (messages: ChatMessage[]) => void) {
    this.subscribers.push(callback)
  }

  public async run() {
    for (let i = 0; i < this.maxAutoIterations; i++) {
      const { toolCallRequests } = await this.streamSingleResponse()
      if (toolCallRequests.length === 0) {
        return
      }

      // FIXME: Implement tool call approval logic
      const toolMessage: ChatToolMessage = {
        role: 'tool' as const,
        id: uuidv4(),
        toolCalls: toolCallRequests.map((toolCall) => ({
          request: toolCall,
          response: {
            status:
              Math.random() < 0.5 ? 'pending_execution' : 'pending_approval',
          },
        })),
      }

      this.updateResponseMessages((messages) => [...messages, toolMessage])

      await Promise.all(
        toolMessage.toolCalls
          .filter(
            (toolCall) => toolCall.response.status === 'pending_execution',
          )
          .map(async (toolCall) => {
            const response = await this.mcpManager.callTool({
              name: toolCall.request.name,
              args: toolCall.request.arguments,
              id: toolCall.request.id,
              signal: this.abortSignal,
            })
            this.updateResponseMessages((messages) =>
              messages.map((message) =>
                message.id === toolMessage.id && message.role === 'tool'
                  ? {
                      ...message,
                      toolCalls: message.toolCalls?.map((tc) =>
                        tc.request.id === toolCall.request.id
                          ? {
                              ...tc,
                              response,
                            }
                          : tc,
                      ),
                    }
                  : message,
              ),
            )
          }),
      )

      const updatedToolMessage = this.responseMessages.find(
        (message) => message.id === toolMessage.id && message.role === 'tool',
      ) as ChatToolMessage | undefined
      if (
        !updatedToolMessage?.toolCalls?.every((toolCall) =>
          ['success', 'error'].includes(toolCall.response.status),
        )
      ) {
        // Exit the auto-iteration loop if any tool call hasn't completed
        // Only 'success' or 'error' states are considered complete
        return
      }
    }
  }

  private async streamSingleResponse(): Promise<{
    toolCallRequests: ToolCallRequest[]
  }> {
    const requestMessages = await this.promptGenerator.generateRequestMessages({
      messages: [...this.receivedMessages, ...this.responseMessages],
    })

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
    if (this.responseMessages.at(-1)?.role !== 'assistant') {
      this.responseMessages.push({
        role: 'assistant',
        content: '',
        id: uuidv4(),
      })
    }
    const responseMessageId = (
      this.responseMessages.at(-1) as ChatAssistantMessage
    ).id
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

    this.updateResponseMessages((messages) =>
      messages.map((message) =>
        message.id === responseMessageId && message.role === 'assistant'
          ? {
              ...message,
              toolCallRequests:
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

    // TODO: rewrite this code in a way that is more readable
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
        this.updateResponseMessages((messages) =>
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

    this.updateResponseMessages((messages) =>
      messages.map((message) =>
        message.id === responseMessageId && message.role === 'assistant'
          ? {
              ...message,
              content: message.content + content,
              reasoning: reasoning
                ? (message.reasoning ?? '') + reasoning
                : message.reasoning,
              annotations: this.mergeAnnotations(
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

  private updateResponseMessages(
    updaterFunction: (messages: ChatMessage[]) => ChatMessage[],
  ) {
    this.responseMessages = updaterFunction(this.responseMessages)
    this.notifySubscribers(this.responseMessages)
  }

  private notifySubscribers(messages: ChatMessage[]) {
    this.subscribers.forEach((callback) => callback(messages))
  }

  private mergeAnnotations = (
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
