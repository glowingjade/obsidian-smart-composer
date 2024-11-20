import Anthropic from '@anthropic-ai/sdk'
import {
  MessageParam,
  MessageStreamEvent,
} from '@anthropic-ai/sdk/resources/messages'

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

export class AnthropicProvider implements BaseLLMProvider {
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  }

  async generateResponse(
    model: LLMModel,
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (!this.client.apiKey) {
      throw new LLMAPIKeyNotSetException(
        'Anthropic API key is missing. Please set it in settings menu.',
      )
    }

    const systemMessages = request.messages.filter((m) => m.role === 'system')
    if (systemMessages.length > 1) {
      throw new Error('Anthropic does not support more than one system message')
    }

    try {
      const response = await this.client.messages.create(
        {
          model: request.model,
          messages: request.messages
            .filter((m) => m.role !== 'system')
            .map((m) => AnthropicProvider.parseRequestMessage(m)),
          system:
            systemMessages.length > 0 ? systemMessages[0].content : undefined,
          max_tokens: request.max_tokens ?? 4096,
          temperature: request.temperature,
          top_p: request.top_p,
        },
        {
          signal: options?.signal,
        },
      )

      return AnthropicProvider.parseNonStreamingResponse(response)
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        throw new LLMAPIKeyInvalidException(
          'Anthropic API key is invalid. Please update it in settings menu.',
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
        'Anthropic API key is missing. Please set it in settings menu.',
      )
    }

    const systemMessages = request.messages.filter((m) => m.role === 'system')
    if (systemMessages.length > 1) {
      throw new Error('Anthropic does not support more than one system message')
    }

    try {
      const stream = await this.client.messages.create(
        {
          model: request.model,
          messages: request.messages
            .filter((m) => m.role !== 'system')
            .map((m) => AnthropicProvider.parseRequestMessage(m)),
          system:
            systemMessages.length > 0 ? systemMessages[0].content : undefined,
          max_tokens: request.max_tokens ?? 4096,
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
        let messageId = ''
        let model = ''
        for await (const chunk of stream) {
          if (chunk.type === 'message_start') {
            messageId = chunk.message.id
            model = chunk.message.model

            yield {
              id: messageId,
              choices: [],
              object: 'chat.completion.chunk',
              model: model,
              usage: {
                prompt_tokens: chunk.message.usage.input_tokens,
                completion_tokens: chunk.message.usage.output_tokens,
                total_tokens:
                  chunk.message.usage.input_tokens +
                  chunk.message.usage.output_tokens,
              },
            }
          } else if (chunk.type === 'content_block_delta') {
            yield AnthropicProvider.parseStreamingResponseChunk(
              chunk,
              messageId,
              model,
            )
          } else if (chunk.type === 'message_delta') {
            yield {
              id: messageId,
              choices: [],
              object: 'chat.completion.chunk',
              model: model,
              usage: {
                prompt_tokens: 0,
                completion_tokens: chunk.usage.output_tokens,
                total_tokens: chunk.usage.output_tokens,
              },
            }
          }
        }
      }

      return streamResponse()
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        throw new LLMAPIKeyInvalidException(
          'Anthropic API key is invalid. Please update it in settings menu.',
        )
      }

      throw error
    }
  }

  static parseRequestMessage(message: RequestMessage): MessageParam {
    if (message.role !== 'user' && message.role !== 'assistant') {
      throw new Error('Unsupported role')
    }
    return {
      role: message.role,
      content: message.content,
    }
  }

  static parseNonStreamingResponse(
    response: Anthropic.Message,
  ): LLMResponseNonStreaming {
    if (response.content[0].type === 'tool_use') {
      throw new Error('Unsupported content type: tool_use')
    }
    return {
      id: response.id,
      choices: [
        {
          finish_reason: response.stop_reason,
          message: {
            content: response.content[0].text,
            role: response.role,
          },
        },
      ],
      model: response.model,
      object: 'chat.completion',
      usage: {
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens,
        total_tokens:
          response.usage.input_tokens + response.usage.output_tokens,
      },
    }
  }

  static parseStreamingResponseChunk(
    chunk: MessageStreamEvent,
    messageId: string,
    model: string,
  ): LLMResponseStreaming {
    if (chunk.type !== 'content_block_delta') {
      throw new Error('Unsupported chunk type')
    }
    if (chunk.delta.type === 'input_json_delta') {
      throw new Error('Unsupported content type: input_json_delta')
    }
    return {
      id: messageId,
      choices: [
        {
          finish_reason: null,
          delta: {
            content: chunk.delta.text,
          },
        },
      ],
      object: 'chat.completion.chunk',
      model: model,
    }
  }
}
