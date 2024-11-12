import Anthropic from '@anthropic-ai/sdk'
import {
  MessageParam,
  MessageStreamEvent,
} from '@anthropic-ai/sdk/resources/messages'

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

export type AnthropicModel = 'claude-3-5-sonnet-latest'
export const ANTHROPIC_MODELS: AnthropicModel[] = ['claude-3-5-sonnet-latest']

export class AnthropicProvider implements BaseLLMProvider {
  private client: Anthropic

  private static readonly ERRORS = {
    API_KEY_MISSING:
      'Anthropic API key is missing. Please set it in settings menu.',
    API_KEY_INVALID:
      'Anthropic API key is invalid. Please update it in settings menu.',
    MODEL_NOT_SUPPORTED: (model: string) =>
      `Anthropic model ${model} is not supported.`,
  } as const

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  }

  async generateResponse(
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (!this.client.apiKey) {
      throw new LLMAPIKeyNotSetException(
        AnthropicProvider.ERRORS.API_KEY_MISSING,
      )
    }

    if (!ANTHROPIC_MODELS.includes(request.model as AnthropicModel)) {
      throw new LLMModelNotSupportedException(
        AnthropicProvider.ERRORS.MODEL_NOT_SUPPORTED(request.model),
      )
    }

    const systemMessages = request.messages.filter((m) => m.role === 'system')
    const systemInstruction: string | undefined =
      systemMessages.length > 0
        ? systemMessages.map((m) => m.content).join('\n')
        : undefined

    try {
      const response = await this.client.messages.create(
        {
          model: request.model,
          messages: request.messages
            .filter((m) => m.role !== 'system')
            .map((m) => AnthropicProvider.parseRequestMessage(m)),
          system: systemInstruction,
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
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    if (!this.client.apiKey) {
      throw new LLMAPIKeyNotSetException(
        AnthropicProvider.ERRORS.API_KEY_MISSING,
      )
    }

    if (!ANTHROPIC_MODELS.includes(request.model as AnthropicModel)) {
      throw new LLMModelNotSupportedException(
        AnthropicProvider.ERRORS.MODEL_NOT_SUPPORTED(request.model),
      )
    }

    const systemMessages = request.messages.filter((m) => m.role === 'system')
    const systemInstruction: string | undefined =
      systemMessages.length > 0
        ? systemMessages.map((m) => m.content).join('\n')
        : undefined

    try {
      const stream = await this.client.messages.create(
        {
          model: request.model,
          messages: request.messages
            .filter((m) => m.role !== 'system')
            .map((m) => AnthropicProvider.parseRequestMessage(m)),
          system: systemInstruction,
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
            continue
          }
          if (chunk.type === 'content_block_delta') {
            yield AnthropicProvider.parseStreamingResponseChunk(
              chunk,
              messageId,
              model,
            )
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

  getSupportedModels(): string[] {
    return ANTHROPIC_MODELS
  }
}
