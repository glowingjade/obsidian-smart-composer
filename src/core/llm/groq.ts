import Groq from 'groq-sdk'
import {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionMessageParam,
} from 'groq-sdk/resources/chat/completions'

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

export class GroqProvider implements BaseLLMProvider {
  private client: Groq

  constructor(apiKey: string) {
    this.client = new Groq({
      apiKey,
      dangerouslyAllowBrowser: true,
    })
  }

  async generateResponse(
    model: LLMModel,
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (!this.client.apiKey) {
      throw new LLMAPIKeyNotSetException(
        'Groq API key is missing. Please set it in settings menu.',
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
        throw new LLMAPIKeyInvalidException(
          'Groq API key is invalid. Please update it in settings menu.',
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
    if (!this.client.apiKey) {
      throw new LLMAPIKeyNotSetException(
        'Groq API key is missing. Please set it in settings menu.',
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
        throw new LLMAPIKeyInvalidException(
          'Groq API key is invalid. Please update it in settings menu.',
        )
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
}
