import type {
  FunctionTool,
  ResponseUsage as OpenAIResponseUsage,
  Response,
  ResponseCreateParamsBase,
  ResponseInput,
  ResponseInputItem,
  ResponseInputMessageContentList,
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
import {
  StreamSource,
  postJson,
  postStream,
} from '../../utils/llm/httpTransport'
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
    const body = this.buildRequestBody({ request, stream: false })
    const payload = await postJson<Response>(this.endpoint, body, {
      headers,
      signal: options?.signal,
      fetchFn: this.fetchFn,
    })
    const content = extractResponseText(payload)
    const toolCalls = extractToolCalls(payload)

    return {
      id: payload.id,
      created: payload.created_at,
      model: payload.model,
      object: 'chat.completion',
      choices: [
        {
          finish_reason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
          message: {
            role: 'assistant',
            content,
            ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
          },
        },
      ],
      system_fingerprint: getSystemFingerprint(payload),
      usage: mapUsage(payload.usage),
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

    return {
      model: request.model,
      input,
      instructions,
      store: false,
      stream,
      tools,
      tool_choice: normalizeToolChoice(request.tool_choice),
      ...(request.reasoning_effort && {
        reasoning: {
          effort: request.reasoning_effort,
        },
      }),
    }
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

function getSystemFingerprint(payload: Response): string | undefined {
  return (payload as { system_fingerprint?: string }).system_fingerprint
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
