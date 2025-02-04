import Anthropic from '@anthropic-ai/sdk'
import {
  ImageBlockParam,
  MessageParam,
  MessageStreamEvent,
  TextBlockParam,
} from '@anthropic-ai/sdk/resources/messages'

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
  ResponseUsage,
} from '../../types/llm/response'
import { LLMProvider } from '../../types/provider.types'
import { parseImageDataUrl } from '../../utils/image'

import { BaseLLMProvider } from './base'
import {
  LLMAPIKeyInvalidException,
  LLMAPIKeyNotSetException,
} from './exception'

export class AnthropicProvider extends BaseLLMProvider<
  Extract<LLMProvider, { type: 'anthropic' }>
> {
  private client: Anthropic

  private static readonly DEFAULT_MAX_TOKENS = 8192

  constructor(provider: Extract<LLMProvider, { type: 'anthropic' }>) {
    super(provider)
    this.client = new Anthropic({
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
    if (model.providerType !== 'anthropic') {
      throw new Error('Model is not a Anthropic model')
    }

    if (!this.client.apiKey) {
      throw new LLMAPIKeyNotSetException(
        `Provider ${this.provider.id} API key is missing. Please set it in settings menu.`,
      )
    }

    const systemMessage = AnthropicProvider.validateSystemMessages(
      request.messages,
    )

    try {
      const response = await this.client.messages.create(
        {
          model: request.model,
          messages: request.messages
            .filter((m) => m.role !== 'system')
            .filter((m) => !AnthropicProvider.isMessageEmpty(m))
            .map((m) => AnthropicProvider.parseRequestMessage(m)),
          system: systemMessage,
          max_tokens:
            request.max_tokens ?? AnthropicProvider.DEFAULT_MAX_TOKENS,
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
    if (model.providerType !== 'anthropic') {
      throw new Error('Model is not a Anthropic model')
    }

    if (!this.client.apiKey) {
      throw new LLMAPIKeyNotSetException(
        `Provider ${this.provider.id} API key is missing. Please set it in settings menu.`,
      )
    }

    const systemMessage = AnthropicProvider.validateSystemMessages(
      request.messages,
    )

    try {
      const stream = await this.client.messages.create(
        {
          model: request.model,
          messages: request.messages
            .filter((m) => m.role !== 'system')
            .filter((m) => !AnthropicProvider.isMessageEmpty(m))
            .map((m) => AnthropicProvider.parseRequestMessage(m)),
          system: systemMessage,
          max_tokens:
            request.max_tokens ?? AnthropicProvider.DEFAULT_MAX_TOKENS,
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
        let usage: ResponseUsage = {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        }

        for await (const chunk of stream) {
          if (chunk.type === 'message_start') {
            messageId = chunk.message.id
            model = chunk.message.model
            usage = {
              prompt_tokens: chunk.message.usage.input_tokens,
              completion_tokens: chunk.message.usage.output_tokens,
              total_tokens:
                chunk.message.usage.input_tokens +
                chunk.message.usage.output_tokens,
            }
          } else if (chunk.type === 'content_block_delta') {
            yield AnthropicProvider.parseStreamingResponseChunk(
              chunk,
              messageId,
              model,
            )
          } else if (chunk.type === 'message_delta') {
            usage = {
              prompt_tokens: usage.prompt_tokens,
              completion_tokens:
                usage.completion_tokens + chunk.usage.output_tokens,
              total_tokens: usage.total_tokens + chunk.usage.output_tokens,
            }
          }
        }

        // After the stream is complete, yield the final usage
        yield {
          id: messageId,
          choices: [],
          object: 'chat.completion.chunk',
          model: model,
          usage: usage,
        }
      }

      return streamResponse()
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        throw new LLMAPIKeyInvalidException(
          `Provider ${this.provider.id} API key is invalid. Please update it in settings menu.`,
        )
      }

      throw error
    }
  }

  static parseRequestMessage(message: RequestMessage): MessageParam {
    if (message.role !== 'user' && message.role !== 'assistant') {
      throw new Error(`Anthropic does not support role: ${message.role}`)
    }

    if (message.role === 'user' && Array.isArray(message.content)) {
      const content = message.content.map(
        (part): TextBlockParam | ImageBlockParam => {
          switch (part.type) {
            case 'text':
              return { type: 'text', text: part.text }
            case 'image_url': {
              const { mimeType, base64Data } = parseImageDataUrl(
                part.image_url.url,
              )
              AnthropicProvider.validateImageType(mimeType)
              return {
                type: 'image',
                source: {
                  data: base64Data,
                  media_type:
                    mimeType as ImageBlockParam['source']['media_type'],
                  type: 'base64',
                },
              }
            }
          }
        },
      )
      return { role: 'user', content }
    }

    return {
      role: message.role,
      content: message.content as string,
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

  private static validateSystemMessages(
    messages: RequestMessage[],
  ): string | undefined {
    const systemMessages = messages.filter((m) => m.role === 'system')
    if (systemMessages.length > 1) {
      throw new Error(`Anthropic does not support more than one system message`)
    }
    const systemMessage =
      systemMessages.length > 0 ? systemMessages[0].content : undefined
    if (systemMessage && typeof systemMessage !== 'string') {
      throw new Error(
        `Anthropic only supports string content for system messages`,
      )
    }
    return systemMessage
  }

  private static isMessageEmpty(message: RequestMessage) {
    if (typeof message.content === 'string') {
      return message.content.trim() === ''
    }
    return message.content.length === 0
  }

  private static validateImageType(mimeType: string) {
    const SUPPORTED_IMAGE_TYPES = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ]
    if (!SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
      throw new Error(
        `Anthropic does not support image type ${mimeType}. Supported types: ${SUPPORTED_IMAGE_TYPES.join(
          ', ',
        )}`,
      )
    }
  }

  async getEmbedding(_model: string, _text: string): Promise<number[]> {
    throw new Error(
      `Provider ${this.provider.id} does not support embeddings. Please use a different provider.`,
    )
  }
}
