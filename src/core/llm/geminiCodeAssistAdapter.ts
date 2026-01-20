import { GenerateContentResponse, Part } from '@google/genai'

import {
  GEMINI_CODE_ASSIST_ENDPOINT,
  GEMINI_CODE_ASSIST_HEADERS,
} from '../../constants'
import { ChatModel } from '../../types/chat-model.types'
import {
  LLMRequest,
  LLMRequestNonStreaming,
  LLMRequestStreaming,
  RequestMessage,
} from '../../types/llm/request'
import {
  LLMResponseNonStreaming,
  LLMResponseStreaming,
} from '../../types/llm/response'
import {
  StreamSource,
  postJson,
  postStream,
} from '../../utils/llm/httpTransport'
import { parseJsonSseStream } from '../../utils/llm/sse'

import { GeminiProvider } from './gemini'
import type {
  CodeAssistGenerateContentRequest,
  CodeAssistGenerateContentResponse,
  CodeAssistRequestPayload,
} from './gemini.types'

type GeminiAdapterConfig = {
  endpoint?: string
  fetchFn?: typeof fetch
}

export class GeminiCodeAssistAdapter {
  private endpoint: string
  private fetchFn?: typeof fetch

  constructor(config: GeminiAdapterConfig = {}) {
    this.endpoint = config.endpoint ?? GEMINI_CODE_ASSIST_ENDPOINT
    this.fetchFn = config.fetchFn
  }

  async generateResponse(
    model: ChatModel & { providerType: 'gemini-plan' },
    request: LLMRequestNonStreaming,
    headers: Record<string, string>,
    projectId: string,
    options?: { signal?: AbortSignal },
  ): Promise<LLMResponseNonStreaming> {
    const requestPayload = this.buildRequestBody(model, request, projectId)
    const url = `${this.endpoint}/v1internal:generateContent`
    const codeAssistResponse =
      await postJson<CodeAssistGenerateContentResponse>(url, requestPayload, {
        headers: {
          ...headers,
          ...GEMINI_CODE_ASSIST_HEADERS,
        },
        signal: options?.signal,
        fetchFn: this.fetchFn,
      })
    const response = codeAssistResponse.response
    // Attach SDK prototype so getter helpers like response.text work on plain JSON.
    Object.setPrototypeOf(response, GenerateContentResponse.prototype)
    const messageId = crypto.randomUUID()
    return GeminiProvider.parseNonStreamingResponse(
      response,
      request.model,
      messageId,
    )
  }

  async streamResponse(
    model: ChatModel & { providerType: 'gemini-plan' },
    request: LLMRequestStreaming,
    headers: Record<string, string>,
    projectId: string,
    options?: { signal?: AbortSignal },
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    const payload = this.buildRequestBody(model, request, projectId)
    const url = `${this.endpoint}/v1internal:streamGenerateContent?alt=sse`
    const stream = await postStream(url, payload, {
      headers: {
        ...headers,
        ...GEMINI_CODE_ASSIST_HEADERS,
        Accept: 'text/event-stream',
      },
      signal: options?.signal,
      fetchFn: this.fetchFn,
    })
    const messageId = crypto.randomUUID()
    return this.streamResponseGenerator(stream, request.model, messageId)
  }

  private async *streamResponseGenerator(
    body: StreamSource,
    model: string,
    messageId: string,
  ): AsyncIterable<LLMResponseStreaming> {
    for await (const chunk of parseJsonSseStream<CodeAssistGenerateContentResponse>(
      body,
    )) {
      const response = chunk.response
      // Attach SDK prototype so getter helpers like response.text work on plain JSON.
      Object.setPrototypeOf(response, GenerateContentResponse.prototype)
      yield GeminiProvider.parseStreamingResponseChunk(
        response,
        model,
        messageId,
      )
    }
  }

  private buildRequestBody(
    model: ChatModel & { providerType: 'gemini-plan' },
    request: LLMRequest,
    projectId: string,
  ): CodeAssistGenerateContentRequest {
    const systemMessages = request.messages.filter((m) => m.role === 'system')
    const systemInstruction =
      systemMessages.length > 0
        ? systemMessages.map((m) => m.content).join('\n')
        : undefined

    const contentEntries: {
      content: NonNullable<
        ReturnType<typeof GeminiProvider.parseRequestMessage>
      >
      message: RequestMessage
    }[] = []
    for (const message of request.messages) {
      const content = GeminiProvider.parseRequestMessage(message)
      if (content) {
        contentEntries.push({ content, message })
      }
    }

    const contents = contentEntries.map((entry) => entry.content)
    addThoughtSignatures(contentEntries)

    const generationConfig = {
      maxOutputTokens: request.max_tokens,
      temperature: request.temperature,
      topP: request.top_p,
      presencePenalty: request.presence_penalty,
      frequencyPenalty: request.frequency_penalty,
      thinkingConfig: GeminiProvider.buildThinkingConfig(model),
    }

    const requestPayload: CodeAssistRequestPayload = {
      contents,
    }

    if (systemInstruction) {
      requestPayload.systemInstruction = {
        role: 'system',
        parts: [{ text: systemInstruction }],
      }
    }
    if (request.tools?.length) {
      requestPayload.tools = request.tools.map((tool) =>
        GeminiProvider.parseRequestTool(tool),
      )
    }
    if (Object.values(generationConfig).some((value) => value !== undefined)) {
      requestPayload.generationConfig = generationConfig
    }

    return {
      project: projectId,
      model: request.model,
      request: requestPayload,
    }
  }
}

function addThoughtSignatures(
  entries: {
    content: { parts?: Part[] }
    message: RequestMessage
  }[],
) {
  entries.forEach((entry) => {
    if (entry.message.role !== 'assistant') {
      return
    }
    if (!entry.message.tool_calls?.length) {
      return
    }
    entry.content.parts?.forEach((part) => {
      if (part.functionCall && !part.thoughtSignature) {
        part.thoughtSignature = 'skip_thought_signature_validator'
      }
    })
  })
}
