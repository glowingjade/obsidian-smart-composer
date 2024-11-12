import Groq from 'groq-sdk'
import {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionMessageParam,
} from 'groq-sdk/resources/chat/completions'

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

export type GroqModel =
  | 'llama-3.1-8b-instant'
  | 'llama-3.1-70b-versatile'
  | 'llama3-8b-8192'
  | 'llama3-70b-8192'
  | 'mixtral-8x7b-32768'
export const GROQ_MODELS: GroqModel[] = [
  'llama-3.1-8b-instant',
  'llama-3.1-70b-versatile',
  'llama3-8b-8192',
  'llama3-70b-8192',
  'mixtral-8x7b-32768',
]

export class GroqProvider implements BaseLLMProvider {
  private client: Groq

  private static readonly ERRORS = {
    API_KEY_MISSING: 'Groq API key is missing. Please set it in settings menu.',
    API_KEY_INVALID:
      'Groq API key is invalid. Please update it in settings menu.',
    MODEL_NOT_SUPPORTED: (model: string) =>
      `Groq model ${model} is not supported.`,
  } as const

  constructor(apiKey: string) {
    this.client = new Groq({
      apiKey,
      dangerouslyAllowBrowser: true,
    })
  }

  async generateResponse(
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (!this.client.apiKey) {
      throw new LLMAPIKeyNotSetException(GroqProvider.ERRORS.API_KEY_MISSING)
    }

    if (!GROQ_MODELS.includes(request.model as GroqModel)) {
      throw new LLMModelNotSupportedException(
        GroqProvider.ERRORS.MODEL_NOT_SUPPORTED(request.model),
      )
    }

    try {
      const response = await this.client.chat.completions.create(
        {
          model: request.model,
          messages: request.messages.map((m) =>
            GroqProvider.parseRequestMessage(m),
          ),
          max_tokens: request.max_tokens,
          temperature: request.temperature,
          top_p: request.top_p,
        },
        {
          signal: options?.signal,
        },
      )
      return GroqProvider.parseNonStreamingResponse(response)
    } catch (error) {
      if (error instanceof Groq.AuthenticationError) {
        throw new LLMAPIKeyInvalidException(GroqProvider.ERRORS.API_KEY_INVALID)
      }
      throw error
    }
  }

  async streamResponse(
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    if (!this.client.apiKey) {
      throw new LLMAPIKeyNotSetException(GroqProvider.ERRORS.API_KEY_MISSING)
    }

    if (!GROQ_MODELS.includes(request.model as GroqModel)) {
      throw new LLMModelNotSupportedException(
        GroqProvider.ERRORS.MODEL_NOT_SUPPORTED(request.model),
      )
    }

    try {
      const stream = await this.client.chat.completions.create(
        {
          model: request.model,
          messages: request.messages.map((m) =>
            GroqProvider.parseRequestMessage(m),
          ),
          max_tokens: request.max_tokens,
          temperature: request.temperature,
          top_p: request.top_p,
          stream: true,
        },
        {
          signal: options?.signal,
        },
      )

      // eslint-disable-next-line no-inner-declarations
      async function* streamResponse(): AsyncIterable<LLMResponseStreaming> {
        for await (const chunk of stream) {
          yield GroqProvider.parseStreamingResponseChunk(chunk)
        }
      }

      return streamResponse()
    } catch (error) {
      if (error instanceof Groq.AuthenticationError) {
        throw new LLMAPIKeyInvalidException(GroqProvider.ERRORS.API_KEY_INVALID)
      }
      throw error
    }
  }

  static parseRequestMessage(
    message: RequestMessage,
  ): ChatCompletionMessageParam {
    return {
      role: message.role,
      content: message.content,
    }
  }

  static parseNonStreamingResponse(
    response: ChatCompletion,
  ): LLMResponseNonStreaming {
    return {
      id: response.id,
      choices: response.choices.map((choice) => ({
        finish_reason: choice.finish_reason,
        message: {
          content: choice.message.content,
          role: choice.message.role,
        },
      })),
      created: response.created,
      model: response.model,
      object: 'chat.completion',
      usage: response.usage,
    }
  }

  static parseStreamingResponseChunk(
    chunk: ChatCompletionChunk,
  ): LLMResponseStreaming {
    return {
      id: chunk.id,
      choices: chunk.choices.map((choice) => ({
        finish_reason: choice.finish_reason ?? null,
        delta: {
          content: choice.delta.content ?? null,
          role: choice.delta.role,
        },
      })),
      created: chunk.created,
      model: chunk.model,
      object: 'chat.completion.chunk',
    }
  }

  getSupportedModels(): string[] {
    return GROQ_MODELS
  }
}
