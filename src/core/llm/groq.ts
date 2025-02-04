import Groq from 'groq-sdk'
import {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
} from 'groq-sdk/resources/chat/completions'

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

import { BaseLLMProvider } from './base'
import {
  LLMAPIKeyInvalidException,
  LLMAPIKeyNotSetException,
} from './exception'

export class GroqProvider extends BaseLLMProvider<
  Extract<LLMProvider, { type: 'groq' }>
> {
  private client: Groq

  constructor(provider: Extract<LLMProvider, { type: 'groq' }>) {
    super(provider)
    this.client = new Groq({
      apiKey: provider.apiKey,
      baseURL: provider.baseUrl
        ? provider.baseUrl.replace(/\/+$/, '')
        : undefined, // use default
      dangerouslyAllowBrowser: true,
    })
  }

  async generateResponse(
    model: ChatModel,
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (model.providerType !== 'groq') {
      throw new Error('Model is not a Groq model')
    }

    if (!this.client.apiKey) {
      throw new LLMAPIKeyNotSetException(
        `Provider ${this.provider.id} API key is missing. Please set it in settings menu.`,
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
    if (model.providerType !== 'groq') {
      throw new Error('Model is not a Groq model')
    }

    if (!this.client.apiKey) {
      throw new LLMAPIKeyNotSetException(
        `Provider ${this.provider.id} API key is missing. Please set it in settings menu.`,
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
          `Provider ${this.provider.id} API key is invalid. Please update it in settings menu.`,
        )
      }
      throw error
    }
  }

  async getEmbedding(_model: string, _text: string): Promise<number[]> {
    throw new Error(
      `Provider ${this.provider.id} does not support embeddings. Please use a different provider.`,
    )
  }

  static parseRequestMessage(
    message: RequestMessage,
  ): ChatCompletionMessageParam {
    switch (message.role) {
      case 'user': {
        const content = Array.isArray(message.content)
          ? message.content.map((part): ChatCompletionContentPart => {
              switch (part.type) {
                case 'text':
                  return { type: 'text', text: part.text }
                case 'image_url':
                  return { type: 'image_url', image_url: part.image_url }
              }
            })
          : message.content
        return { role: 'user', content }
      }
      case 'assistant': {
        if (Array.isArray(message.content)) {
          throw new Error('Assistant message should be a string')
        }
        return { role: 'assistant', content: message.content }
      }
      case 'system': {
        if (Array.isArray(message.content)) {
          throw new Error('System message should be a string')
        }
        return { role: 'system', content: message.content }
      }
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
