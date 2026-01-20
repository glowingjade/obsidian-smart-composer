import type {
  FunctionTool,
  ResponseUsage as OpenAIResponseUsage,
  Response,
  ResponseCreateParamsBase,
  ResponseInput,
  ResponseInputItem,
  ResponseInputMessageContentList,
  ResponseReasoningItem,
  ResponseStreamEvent,
} from 'openai/resources/responses/responses'

import { CODEX_RESPONSES_ENDPOINT } from '../../constants'
import {
  LLMOptions,
  LLMRequest,
  LLMRequestNonStreaming,
  LLMRequestStreaming,
  RequestMessage,
} from '../../types/llm/request'
import {
  LLMResponseNonStreaming,
  LLMResponseStreaming,
  ResponseUsage,
  ToolCall,
  ToolCallDelta,
} from '../../types/llm/response'
import { StreamSource, postStream } from '../../utils/llm/httpTransport'
import { parseJsonSseStream } from '../../utils/llm/sse'

type CodexAdapterConfig = {
  endpoint?: string
  fetchFn?: typeof fetch
}

export class CodexMessageAdapter {
  private endpoint: string
  private fetchFn?: typeof fetch

  constructor(config: CodexAdapterConfig = {}) {
    this.endpoint = config.endpoint ?? CODEX_RESPONSES_ENDPOINT
    this.fetchFn = config.fetchFn
  }

  async generateResponse(
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
    headers?: Record<string, string>,
  ): Promise<LLMResponseNonStreaming> {
    // Codex Responses require stream: true; build a snapshot from the stream.
    const body = this.buildRequestBody({ request, stream: true })
    const stream = await postStream(this.endpoint, body, {
      headers,
      signal: options?.signal,
      fetchFn: this.fetchFn,
    })

    let summaryText = ''
    let responsePayload: Response | undefined
    for await (const chunk of parseJsonSseStream<ResponseStreamEvent>(stream)) {
      if (chunk.type === 'response.created') {
        responsePayload = chunk.response
        continue
      }

      if (chunk.type === 'error') {
        throw new Error(chunk.message)
      }

      if (!responsePayload) {
        throw new Error(
          `Stream event received before response.created: ${chunk.type}`,
        )
      }

      if (chunk.type === 'response.reasoning_summary_text.delta') {
        summaryText += chunk.delta
        continue
      }

      if (chunk.type === 'response.reasoning_summary_text.done') {
        if (!summaryText.length) {
          summaryText = chunk.text
        }
        continue
      }

      responsePayload = accumulateResponseSnapshot(responsePayload, chunk)
    }

    if (!responsePayload) {
      throw new Error('Stream ended without receiving a response payload')
    }

    const content = extractResponseText(responsePayload)
    const toolCalls = extractToolCalls(responsePayload)
    const reasoningSummary =
      extractReasoningSummary(responsePayload) ??
      (summaryText.length ? summaryText : undefined)

    return {
      id: responsePayload.id,
      created: responsePayload.created_at,
      model: responsePayload.model,
      object: 'chat.completion',
      choices: [
        {
          finish_reason: null,
          message: {
            role: 'assistant',
            content,
            ...(reasoningSummary ? { reasoning: reasoningSummary } : {}),
            ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
          },
        },
      ],
      system_fingerprint: getSystemFingerprint(responsePayload),
      usage: mapUsage(responsePayload.usage),
    }
  }

  async streamResponse(
    request: LLMRequestStreaming,
    options?: LLMOptions,
    headers?: Record<string, string>,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    const body = this.buildRequestBody({ request, stream: true })
    const stream = await postStream(this.endpoint, body, {
      headers,
      signal: options?.signal,
      fetchFn: this.fetchFn,
    })
    return this.streamResponseGenerator(stream, request.model)
  }

  private async *streamResponseGenerator(
    body: StreamSource,
    model: string,
  ): AsyncIterable<LLMResponseStreaming> {
    let responseId = ''
    let created = Math.floor(Date.now() / 1000)
    let resolvedModel = model
    let systemFingerprint: string | undefined
    let sentRole = false
    const toolCallInfoByIndex = new Map<
      number,
      { id?: string; name?: string }
    >()
    const toolCallHasDelta = new Set<number>()

    const getChunkId = (itemId?: string) =>
      responseId.length > 0 ? responseId : (itemId ?? 'codex-response')
    for await (const chunk of parseJsonSseStream<ResponseStreamEvent>(body)) {
      if (chunk.type === 'response.created') {
        responseId = chunk.response.id
        created = chunk.response.created_at
        resolvedModel = chunk.response.model
        systemFingerprint = getSystemFingerprint(chunk.response)
        continue
      }

      if (chunk.type === 'response.output_item.added') {
        if (chunk.item.type === 'message' && !sentRole) {
          sentRole = true
          yield {
            id: getChunkId(),
            created,
            model: resolvedModel,
            object: 'chat.completion.chunk',
            system_fingerprint: systemFingerprint,
            choices: [
              {
                finish_reason: null,
                delta: {
                  role: chunk.item.role,
                },
              },
            ],
          }
        }
        if (chunk.item.type === 'function_call') {
          const toolCallIndex = chunk.output_index
          const toolCallDelta: ToolCallDelta = {
            index: toolCallIndex,
            id: chunk.item.call_id,
            type: 'function',
            function: {
              name: chunk.item.name,
              ...(chunk.item.arguments?.length
                ? { arguments: chunk.item.arguments }
                : {}),
            },
          }
          toolCallInfoByIndex.set(toolCallIndex, {
            id: chunk.item.call_id,
            name: chunk.item.name,
          })
          yield {
            id: getChunkId(),
            created,
            model: resolvedModel,
            object: 'chat.completion.chunk',
            system_fingerprint: systemFingerprint,
            choices: [
              {
                finish_reason: null,
                delta: {
                  tool_calls: [toolCallDelta],
                },
              },
            ],
          }
        }
        continue
      }

      if (chunk.type === 'response.output_text.delta') {
        const deltaRole = sentRole ? undefined : 'assistant'
        sentRole = true
        yield {
          id: getChunkId(chunk.item_id),
          created,
          model: resolvedModel,
          object: 'chat.completion.chunk',
          system_fingerprint: systemFingerprint,
          choices: [
            {
              finish_reason: null,
              delta: {
                content: chunk.delta,
                ...(deltaRole ? { role: deltaRole } : {}),
              },
            },
          ],
        }
        continue
      }

      if (chunk.type === 'response.reasoning_summary_text.delta') {
        yield {
          id: getChunkId(chunk.item_id),
          created,
          model: resolvedModel,
          object: 'chat.completion.chunk',
          system_fingerprint: systemFingerprint,
          choices: [
            {
              finish_reason: null,
              delta: {
                reasoning: chunk.delta,
              },
            },
          ],
        }
        continue
      }

      if (chunk.type === 'response.reasoning_summary_text.done') {
        yield {
          id: getChunkId(chunk.item_id),
          created,
          model: resolvedModel,
          object: 'chat.completion.chunk',
          system_fingerprint: systemFingerprint,
          choices: [
            {
              finish_reason: null,
              delta: {
                reasoning: chunk.text,
              },
            },
          ],
        }
        continue
      }

      if (chunk.type === 'response.function_call_arguments.delta') {
        const toolCallIndex = chunk.output_index
        const toolCallInfo = toolCallInfoByIndex.get(toolCallIndex)
        toolCallHasDelta.add(chunk.output_index)
        yield {
          id: getChunkId(chunk.item_id),
          created,
          model: resolvedModel,
          object: 'chat.completion.chunk',
          system_fingerprint: systemFingerprint,
          choices: [
            {
              finish_reason: null,
              delta: {
                tool_calls: [
                  {
                    index: toolCallIndex,
                    id: toolCallInfo?.id,
                    type: 'function',
                    function: {
                      ...(toolCallInfo?.name
                        ? { name: toolCallInfo.name }
                        : {}),
                      arguments: chunk.delta,
                    },
                  },
                ],
              },
            },
          ],
        }
        continue
      }

      if (chunk.type === 'response.function_call_arguments.done') {
        if (!toolCallHasDelta.has(chunk.output_index)) {
          const toolCallIndex = chunk.output_index
          const toolCallInfo = toolCallInfoByIndex.get(toolCallIndex)
          yield {
            id: getChunkId(chunk.item_id),
            created,
            model: resolvedModel,
            object: 'chat.completion.chunk',
            system_fingerprint: systemFingerprint,
            choices: [
              {
                finish_reason: null,
                delta: {
                  tool_calls: [
                    {
                      index: toolCallIndex,
                      id: toolCallInfo?.id,
                      type: 'function',
                      function: {
                        ...(toolCallInfo?.name
                          ? { name: toolCallInfo.name }
                          : {}),
                        arguments: chunk.arguments,
                      },
                    },
                  ],
                },
              },
            ],
          }
        }
        continue
      }

      if (chunk.type === 'response.completed') {
        yield {
          id: getChunkId(),
          created,
          model: resolvedModel,
          object: 'chat.completion.chunk',
          system_fingerprint: systemFingerprint,
          choices: [
            {
              finish_reason: 'stop',
              delta: {},
            },
          ],
          usage: mapUsage(chunk.response.usage),
        }
        continue
      }

      if (chunk.type === 'response.incomplete') {
        yield {
          id: getChunkId(),
          created,
          model: resolvedModel,
          object: 'chat.completion.chunk',
          system_fingerprint: systemFingerprint,
          choices: [
            {
              finish_reason: 'length',
              delta: {},
            },
          ],
          usage: mapUsage(chunk.response.usage),
        }
        continue
      }

      if (chunk.type === 'error') {
        throw new Error(chunk.message)
      }
    }
  }

  private buildRequestBody({
    request,
    stream,
  }: {
    request: LLMRequest
    stream: boolean
  }): ResponseCreateParamsBase {
    const { input, instructions } = buildResponsesInput(request.messages)
    const tools = request.tools
      ? request.tools.map(
          (tool): FunctionTool => ({
            type: 'function',
            name: tool.function.name,
            description: tool.function.description ?? null,
            parameters: tool.function.parameters,
            strict: false,
          }),
        )
      : undefined
    const reasoning =
      request.reasoning_effort || request.reasoning_summary
        ? {
            ...(request.reasoning_effort && {
              effort: request.reasoning_effort,
            }),
            ...(request.reasoning_summary && {
              summary: request.reasoning_summary,
            }),
          }
        : undefined

    const body: ResponseCreateParamsBase = {
      model: request.model,
      input,
      instructions,
      store: false,
      stream,
      tools,
      tool_choice: normalizeToolChoice(request.tool_choice),
      ...(reasoning && {
        reasoning,
      }),
    }
    return body
  }
}

function buildResponsesInput(messages: RequestMessage[]): {
  input: ResponseInput
  instructions?: string
} {
  const systemMessages = messages.filter((msg) => msg.role === 'system')
  const instructions = systemMessages
    .map((msg) => (typeof msg.content === 'string' ? msg.content : ''))
    .filter((content) => content.trim().length > 0)
    .join('\n\n')

  const input: ResponseInputItem[] = []

  for (const message of messages) {
    if (message.role === 'system') {
      continue
    }

    if (message.role === 'user') {
      input.push({
        role: 'user',
        content: normalizeUserContent(message.content),
      })
      continue
    }

    if (message.role === 'assistant') {
      input.push({
        role: 'assistant',
        content: message.content,
      })
      if (message.tool_calls?.length) {
        for (const toolCall of message.tool_calls) {
          input.push({
            type: 'function_call',
            call_id: toolCall.id,
            name: toolCall.name,
            arguments: toolCall.arguments ?? '{}',
          })
        }
      }
      continue
    }

    if (message.role === 'tool') {
      input.push({
        type: 'function_call_output',
        call_id: message.tool_call.id,
        output: message.content,
      })
      continue
    }
  }

  return {
    input,
    instructions: instructions.length > 0 ? instructions : undefined,
  }
}

function normalizeToolChoice(
  choice: LLMRequest['tool_choice'],
): ResponseCreateParamsBase['tool_choice'] {
  if (!choice) {
    return undefined
  }
  if (typeof choice === 'string') {
    return choice
  }
  return {
    type: 'function',
    name: choice.function.name,
  }
}

function normalizeUserContent(
  content: RequestMessage['content'],
): ResponseInputMessageContentList {
  if (typeof content === 'string') {
    return [{ type: 'input_text', text: content }]
  }

  return content.map((part) => {
    if (part.type === 'text') {
      return { type: 'input_text', text: part.text }
    }
    if (part.type === 'image_url') {
      return {
        type: 'input_image',
        image_url: part.image_url.url,
        detail: 'auto',
      }
    }
    return { type: 'input_text', text: '' }
  })
}

function extractResponseText(payload: Response): string {
  if (payload.output_text) {
    return payload.output_text
  }
  const message = payload.output.find((item) => item.type === 'message')
  if (!message) return ''
  return message.content
    .filter((part) => part.type === 'output_text')
    .map((part) => part.text)
    .join('')
}

function extractToolCalls(payload: Response): ToolCall[] {
  const toolCalls: ToolCall[] = []
  for (const output of payload.output) {
    if (output.type === 'function_call') {
      toolCalls.push({
        id: output.call_id,
        type: 'function',
        function: {
          name: output.name,
          ...(output.arguments?.length ? { arguments: output.arguments } : {}),
        },
      })
    }
  }
  return toolCalls
}

function extractReasoningSummary(payload: Response): string | undefined {
  const reasoningItem = payload.output.find(
    (item): item is ResponseReasoningItem => item.type === 'reasoning',
  )
  if (!reasoningItem?.summary?.length) return undefined
  const summaryText = reasoningItem.summary
    .filter((part) => part.type === 'summary_text')
    .map((part) => part.text)
    .join('')
  return summaryText.length > 0 ? summaryText : undefined
}

function getSystemFingerprint(payload: Response): string | undefined {
  return (payload as { system_fingerprint?: string }).system_fingerprint
}

function accumulateResponseSnapshot(
  snapshot: Response,
  event: ResponseStreamEvent,
): Response {
  switch (event.type) {
    case 'response.output_item.added': {
      snapshot.output.push(event.item)
      return snapshot
    }
    case 'response.content_part.added': {
      const output = snapshot.output[event.output_index]
      if (!output) {
        throw new Error(`missing output at index ${event.output_index}`)
      }
      const part = event.part
      if (output.type === 'message' && part.type !== 'reasoning_text') {
        output.content.push(part)
      } else if (
        output.type === 'reasoning' &&
        part.type === 'reasoning_text'
      ) {
        if (!output.content) {
          output.content = []
        }
        output.content.push(part)
      }
      return snapshot
    }
    case 'response.output_text.delta': {
      const output = snapshot.output[event.output_index]
      if (!output) {
        throw new Error(`missing output at index ${event.output_index}`)
      }
      if (output.type === 'message') {
        const content = output.content[event.content_index]
        if (!content) {
          throw new Error(`missing content at index ${event.content_index}`)
        }
        if (content.type !== 'output_text') {
          throw new Error(
            `expected content to be 'output_text', got ${content.type}`,
          )
        }
        content.text += event.delta
      }
      return snapshot
    }
    case 'response.function_call_arguments.delta': {
      const output = snapshot.output[event.output_index]
      if (!output) {
        throw new Error(`missing output at index ${event.output_index}`)
      }
      if (output.type === 'function_call') {
        output.arguments += event.delta
      }
      return snapshot
    }
    case 'response.function_call_arguments.done': {
      const output = snapshot.output[event.output_index]
      if (!output) {
        throw new Error(`missing output at index ${event.output_index}`)
      }
      if (output.type === 'function_call' && !output.arguments?.length) {
        output.arguments = event.arguments
      }
      return snapshot
    }
    case 'response.reasoning_text.delta': {
      const output = snapshot.output[event.output_index]
      if (!output) {
        throw new Error(`missing output at index ${event.output_index}`)
      }
      if (output.type === 'reasoning') {
        const content = output.content?.[event.content_index]
        if (!content) {
          throw new Error(`missing content at index ${event.content_index}`)
        }
        if (content.type !== 'reasoning_text') {
          const contentType = (content as { type: string }).type
          throw new Error(
            `expected content to be 'reasoning_text', got ${contentType}`,
          )
        }
        content.text += event.delta
      }
      return snapshot
    }
    case 'response.completed':
      return event.response
    case 'response.incomplete':
      return event.response
    case 'error':
      return snapshot
  }
  return snapshot
}

function mapUsage(usage?: OpenAIResponseUsage): ResponseUsage | undefined {
  if (!usage) {
    return undefined
  }
  return {
    prompt_tokens: usage.input_tokens,
    completion_tokens: usage.output_tokens,
    total_tokens: usage.total_tokens,
  }
}
