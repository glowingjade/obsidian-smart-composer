import {
  Content,
  EnhancedGenerateContentResponse,
  GenerateContentResult,
  GenerateContentStreamResult,
  GoogleGenerativeAI,
} from '@google/generative-ai'

import { ChatModel } from '../../types/chat-model.types'
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
import { LLMProvider } from '../../types/provider.types'
import { parseImageDataUrl } from '../../utils/image'

import { BaseLLMProvider } from './base'
import {
  LLMAPIKeyInvalidException,
  LLMAPIKeyNotSetException,
  LLMRateLimitExceededException,
} from './exception'

/**
 * Note on OpenAI Compatibility API:
 * Gemini provides an OpenAI-compatible endpoint (https://ai.google.dev/gemini-api/docs/openai)
 * which allows using the OpenAI SDK with Gemini models. However, there are currently CORS issues
 * preventing its use in Obsidian. Consider switching to this endpoint in the future once these
 * issues are resolved.
 */
export class GeminiProvider extends BaseLLMProvider<
  Extract<LLMProvider, { type: 'gemini' }>
> {
  private client: GoogleGenerativeAI
  private apiKey: string

  constructor(provider: Extract<LLMProvider, { type: 'gemini' }>) {
    super(provider)
    if (provider.baseUrl) {
      throw new Error('Gemini does not support custom base URL')
    }

    this.client = new GoogleGenerativeAI(provider.apiKey ?? '')
    this.apiKey = provider.apiKey ?? ''
  }

  async generateResponse(
    model: ChatModel,
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (model.providerType !== 'gemini') {
      throw new Error('Model is not a Gemini model')
    }

    if (!this.apiKey) {
      throw new LLMAPIKeyNotSetException(
        `Provider ${this.provider.id} API key is missing. Please set it in settings menu.`,
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
        request.model,
        messageId,
      )
    } catch (error) {
      const isInvalidApiKey =
        error.message?.includes('API_KEY_INVALID') ||
        error.message?.includes('API key not valid')

      if (isInvalidApiKey) {
        throw new LLMAPIKeyInvalidException(
          `Provider ${this.provider.id} API key is invalid. Please update it in settings menu.`,
        )
      }

      throw error
    }
  }

  async streamResponse(
    model: ChatModel,
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    if (model.providerType !== 'gemini') {
      throw new Error('Model is not a Gemini model')
    }

    if (!this.apiKey) {
      throw new LLMAPIKeyNotSetException(
        `Provider ${this.provider.id} API key is missing. Please set it in settings menu.`,
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
      return this.streamResponseGenerator(stream, request.model, messageId)
    } catch (error) {
      const isInvalidApiKey =
        error.message?.includes('API_KEY_INVALID') ||
        error.message?.includes('API key not valid')

      if (isInvalidApiKey) {
        throw new LLMAPIKeyInvalidException(
          `Gemini API key is invalid. Please update it in settings menu.`,
        )
      }

      throw error
    }
  }

  private async *streamResponseGenerator(
    stream: GenerateContentStreamResult,
    model: string,
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

    if (Array.isArray(message.content)) {
      return {
        role: message.role === 'user' ? 'user' : 'model',
        parts: message.content.map((part) => {
          switch (part.type) {
            case 'text':
              return { text: part.text }
            case 'image_url': {
              const { mimeType, base64Data } = parseImageDataUrl(
                part.image_url.url,
              )
              GeminiProvider.validateImageType(mimeType)

              return {
                inlineData: {
                  data: base64Data,
                  mimeType,
                },
              }
            }
          }
        }),
      }
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
    model: string,
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
    model: string,
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

  private static validateImageType(mimeType: string) {
    const SUPPORTED_IMAGE_TYPES = [
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/heic',
      'image/heif',
    ]
    if (!SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
      throw new Error(
        `Gemini does not support image type ${mimeType}. Supported types: ${SUPPORTED_IMAGE_TYPES.join(
          ', ',
        )}`,
      )
    }
  }

  async getEmbedding(model: string, text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new LLMAPIKeyNotSetException(
        `Provider ${this.provider.id} API key is missing. Please set it in settings menu.`,
      )
    }

    try {
      const response = await this.client
        .getGenerativeModel({ model: model })
        .embedContent(text)
      return response.embedding.values
    } catch (error) {
      if (
        error.status === 429 &&
        error.message.includes('RATE_LIMIT_EXCEEDED')
      ) {
        throw new LLMRateLimitExceededException(
          'Gemini API rate limit exceeded. Please try again later.',
        )
      }
      throw error
    }
  }
}
