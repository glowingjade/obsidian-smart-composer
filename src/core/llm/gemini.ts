import {
  Content,
  EnhancedGenerateContentResponse,
  GenerateContentResult,
  GenerateContentStreamResult,
  GoogleGenerativeAI,
} from '@google/generative-ai'

import {
  LLMOptions,
  LLMRequestNonStreaming,
  LLMRequestStreaming,
  RequestMessage,
} from '../../types/llm/request'
import {
  LLMResponseNonStreaming,
  LLMResponseStreaming,
} from '../../types/llm/response'

import { BaseLLMProvider } from './base'
import {
  LLMAPIKeyInvalidException,
  LLMAPIKeyNotSetException,
  LLMModelNotSupportedException,
} from './exception'

export type GeminiModel =
  | 'gemini-1.5-pro'
  | 'gemini-1.5-flash'
  | 'gemini-1.5-flash-8b'
export const GEMINI_MODELS: GeminiModel[] = [
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
]

export class GeminiProvider implements BaseLLMProvider {
  private client: GoogleGenerativeAI
  private apiKey: string

  private static readonly ERRORS = {
    API_KEY_MISSING:
      'Gemini API key is missing. Please set it in settings menu.',
    API_KEY_INVALID:
      'Gemini API key is invalid. Please update it in settings menu.',
    MODEL_NOT_SUPPORTED: (model: string) =>
      `Gemini model ${model} is not supported.`,
  } as const

  constructor(apiKey: string) {
    this.apiKey = apiKey
    this.client = new GoogleGenerativeAI(apiKey)
  }

  async generateResponse(
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (!this.apiKey) {
      throw new LLMAPIKeyNotSetException(GeminiProvider.ERRORS.API_KEY_MISSING)
    }

    if (!GEMINI_MODELS.includes(request.model as GeminiModel)) {
      throw new LLMModelNotSupportedException(
        GeminiProvider.ERRORS.MODEL_NOT_SUPPORTED(request.model),
      )
    }

    const systemMessages = request.messages.filter((m) => m.role === 'system')
    const systemInstruction: string | undefined =
      systemMessages.length > 0
        ? systemMessages.map((m) => m.content).join('\n')
        : undefined

    try {
      const model = this.client.getGenerativeModel({
        model: request.model,
        generationConfig: {
          maxOutputTokens: request.max_tokens,
          temperature: request.temperature,
          topP: request.top_p,
          presencePenalty: request.presence_penalty,
          frequencyPenalty: request.frequency_penalty,
        },
        systemInstruction: systemInstruction,
      })

      const result = await model.generateContent(
        {
          systemInstruction: systemInstruction,
          contents: request.messages
            .map((message) => GeminiProvider.parseRequestMessage(message))
            .filter((m): m is Content => m !== null),
        },
        {
          signal: options?.signal,
        },
      )

      const messageId = crypto.randomUUID() // Gemini does not return a message id
      return GeminiProvider.parseNonStreamingResponse(
        result,
        request.model as GeminiModel,
        messageId,
      )
    } catch (error) {
      const isInvalidApiKey =
        error.message?.includes('API_KEY_INVALID') ||
        error.message?.includes('API key not valid')

      if (isInvalidApiKey) {
        throw new LLMAPIKeyInvalidException(
          GeminiProvider.ERRORS.API_KEY_INVALID,
        )
      }

      throw error
    }
  }

  async streamResponse(
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    if (!this.apiKey) {
      throw new LLMAPIKeyNotSetException(GeminiProvider.ERRORS.API_KEY_MISSING)
    }

    if (!GEMINI_MODELS.includes(request.model as GeminiModel)) {
      throw new LLMModelNotSupportedException(
        GeminiProvider.ERRORS.MODEL_NOT_SUPPORTED(request.model),
      )
    }

    const systemMessages = request.messages.filter((m) => m.role === 'system')
    const systemInstruction: string | undefined =
      systemMessages.length > 0
        ? systemMessages.map((m) => m.content).join('\n')
        : undefined

    try {
      const model = this.client.getGenerativeModel({
        model: request.model,
        generationConfig: {
          maxOutputTokens: request.max_tokens,
          temperature: request.temperature,
          topP: request.top_p,
          presencePenalty: request.presence_penalty,
          frequencyPenalty: request.frequency_penalty,
        },
        systemInstruction: systemInstruction,
      })

      const stream = await model.generateContentStream(
        {
          systemInstruction: systemInstruction,
          contents: request.messages
            .map((message) => GeminiProvider.parseRequestMessage(message))
            .filter((m): m is Content => m !== null),
        },
        {
          signal: options?.signal,
        },
      )

      const messageId = crypto.randomUUID() // Gemini does not return a message id
      return this.streamResponseGenerator(
        stream,
        request.model as GeminiModel,
        messageId,
      )
    } catch (error) {
      const isInvalidApiKey =
        error.message?.includes('API_KEY_INVALID') ||
        error.message?.includes('API key not valid')

      if (isInvalidApiKey) {
        throw new LLMAPIKeyInvalidException(
          GeminiProvider.ERRORS.API_KEY_INVALID,
        )
      }

      throw error
    }
  }

  private async *streamResponseGenerator(
    stream: GenerateContentStreamResult,
    model: GeminiModel,
    messageId: string,
  ): AsyncIterable<LLMResponseStreaming> {
    for await (const chunk of stream.stream) {
      yield GeminiProvider.parseStreamingResponseChunk(chunk, model, messageId)
    }
  }

  static parseRequestMessage(message: RequestMessage): Content | null {
    if (message.role === 'system') {
      return null
    }
    return {
      role: message.role === 'user' ? 'user' : 'model',
      parts: [
        {
          text: message.content,
        },
      ],
    }
  }

  static parseNonStreamingResponse(
    response: GenerateContentResult,
    model: GeminiModel,
    messageId: string,
  ): LLMResponseNonStreaming {
    return {
      id: messageId,
      choices: [
        {
          finish_reason:
            response.response.candidates?.[0]?.finishReason ?? null,
          message: {
            content: response.response.text(),
            role: 'assistant',
          },
        },
      ],
      created: Date.now(),
      model: model,
      object: 'chat.completion',
      usage: response.response.usageMetadata
        ? {
            prompt_tokens: response.response.usageMetadata.promptTokenCount,
            completion_tokens:
              response.response.usageMetadata.candidatesTokenCount,
            total_tokens: response.response.usageMetadata.totalTokenCount,
          }
        : undefined,
    }
  }

  static parseStreamingResponseChunk(
    chunk: EnhancedGenerateContentResponse,
    model: GeminiModel,
    messageId: string,
  ): LLMResponseStreaming {
    return {
      id: messageId,
      choices: [
        {
          finish_reason: chunk.candidates?.[0]?.finishReason ?? null,
          delta: {
            content: chunk.text(),
          },
        },
      ],
      created: Date.now(),
      model: model,
      object: 'chat.completion.chunk',
      usage: chunk.usageMetadata
        ? {
            prompt_tokens: chunk.usageMetadata.promptTokenCount,
            completion_tokens: chunk.usageMetadata.candidatesTokenCount,
            total_tokens: chunk.usageMetadata.totalTokenCount,
          }
        : undefined,
    }
  }

  getSupportedModels(): string[] {
    return GEMINI_MODELS
  }
}
