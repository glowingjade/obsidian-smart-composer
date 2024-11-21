import {
  Content,
  EnhancedGenerateContentResponse,
  GenerateContentResult,
  GenerateContentStreamResult,
  GoogleGenerativeAI,
} from '@google/generative-ai'

import { LLMModel } from '../../types/llm/model'
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
} from './exception'

/**
 * Note on OpenAI Compatibility API:
 * Gemini provides an OpenAI-compatible endpoint (https://ai.google.dev/gemini-api/docs/openai)
 * which allows using the OpenAI SDK with Gemini models. However, there are currently CORS issues
 * preventing its use in Obsidian. Consider switching to this endpoint in the future once these
 * issues are resolved.
 */
export class GeminiProvider implements BaseLLMProvider {
  private client: GoogleGenerativeAI
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
    this.client = new GoogleGenerativeAI(apiKey)
  }

  async generateResponse(
    model: LLMModel,
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (!this.apiKey) {
      throw new LLMAPIKeyNotSetException(
        'Gemini API key is missing. Please set it in settings menu.',
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
          'Gemini API key is invalid. Please update it in settings menu.',
        )
      }

      throw error
    }
  }

  async streamResponse(
    model: LLMModel,
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    if (!this.apiKey) {
      throw new LLMAPIKeyNotSetException(
        'Gemini API key is missing. Please set it in settings menu.',
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
          'Gemini API key is invalid. Please update it in settings menu.',
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
}
