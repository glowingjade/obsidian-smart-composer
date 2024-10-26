import OpenAI from 'openai'
import {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions'

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

export type OpenAIModel = 'gpt-4o' | 'gpt-4o-mini'
export const OPENAI_MODELS: OpenAIModel[] = ['gpt-4o', 'gpt-4o-mini']

export class OpenAIProvider implements BaseLLMProvider {
  private client: OpenAI

  constructor(apiKey: string, client?: OpenAI | undefined) {
    this.client =
      client ?? new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
  }

  async generateResponse(
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (!this.client.apiKey) {
      throw new LLMAPIKeyNotSetException(
        'OpenAI API key is missing. Please set it in settings menu.',
      )
    }

    try {
      const response = await this.client.chat.completions.create(
        {
          model: request.model,
          messages: request.messages.map((m) =>
            OpenAIProvider.parseRequestMessage(m),
          ),
          max_tokens: request.max_tokens,
          temperature: request.temperature,
          top_p: request.top_p,
          frequency_penalty: request.frequency_penalty,
          presence_penalty: request.presence_penalty,
          logit_bias: request.logit_bias,
        },
        {
          signal: options?.signal,
        },
      )
      return OpenAIProvider.parseNonStreamingResponse(response)
    } catch (error) {
      if (error instanceof OpenAI.AuthenticationError) {
        throw new LLMAPIKeyInvalidException(
          'OpenAI API key is invalid. Please update it in settings menu.',
        )
      }
      throw error
    }
  }

  async streamResponse(
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    if (!this.client.apiKey) {
      throw new LLMAPIKeyNotSetException(
        'OpenAI API key is missing. Please set it in settings menu.',
      )
    }

    try {
      const stream = await this.client.chat.completions.create(
        {
          model: request.model,
          messages: request.messages.map((m) =>
            OpenAIProvider.parseRequestMessage(m),
          ),
          max_completion_tokens: request.max_tokens,
          temperature: request.temperature,
          top_p: request.top_p,
          frequency_penalty: request.frequency_penalty,
          presence_penalty: request.presence_penalty,
          logit_bias: request.logit_bias,
          stream: true,
        },
        {
          signal: options?.signal,
        },
      )

      // eslint-disable-next-line no-inner-declarations
      async function* streamResponse(): AsyncIterable<LLMResponseStreaming> {
        for await (const chunk of stream) {
          yield OpenAIProvider.parseStreamingResponseChunk(chunk)
        }
      }

      return streamResponse()
    } catch (error) {
      if (error instanceof OpenAI.AuthenticationError) {
        throw new LLMAPIKeyInvalidException(
          'OpenAI API key is invalid. Please update it in settings menu.',
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
      system_fingerprint: response.system_fingerprint,
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
      system_fingerprint: chunk.system_fingerprint,
      usage: chunk.usage,
    }
  }

  getSupportedModels(): string[] {
    return OPENAI_MODELS
  }
}
