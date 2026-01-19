import Anthropic from '@anthropic-ai/sdk'
import {
  Tool as AnthropicTool,
  ToolChoice as AnthropicToolChoice,
  Base64ImageSource,
  ContentBlockParam,
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
  RequestTool,
  RequestToolChoice,
} from '../../types/llm/request'
import {
  LLMResponseNonStreaming,
  LLMResponseStreaming,
  ResponseUsage,
  ToolCall,
} from '../../types/llm/response'
import { LLMProvider } from '../../types/provider.types'
import { parseImageDataUrl } from '../../utils/llm/image'

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
            .map((m) => AnthropicProvider.parseRequestMessage(m))
            .filter((m) => m !== null),
          system: systemMessage,
          thinking: model.thinking?.enabled
            ? {
                type: 'enabled',
                budget_tokens: model.thinking.budget_tokens,
              }
            : undefined,
          tools: request.tools?.map((t) =>
            AnthropicProvider.parseRequestTool(t),
          ),
          tool_choice: request.tool_choice
            ? AnthropicProvider.parseRequestToolChoice(request.tool_choice)
            : undefined,
          max_tokens:
            request.max_tokens ??
            (model.thinking?.enabled
              ? model.thinking?.budget_tokens +
                AnthropicProvider.DEFAULT_MAX_TOKENS
              : AnthropicProvider.DEFAULT_MAX_TOKENS),
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
        // Anthropic's CORS Policy Change (March 2025)
        // Issue: https://github.com/glowingjade/obsidian-smart-composer/issues/286
        //
        // Anthropic recently changed their CORS policy for new individual accounts:
        // - New individual accounts now have CORS restrictions by default
        // - The error occurs even with valid API keys and anthropic-dangerous-direct-browser-access: true
        // - The error message contains "CORS requests are not allowed for this Organization"
        //
        // Solution: Users need to create an organization in their Anthropic account
        if (
          error.message.includes(
            'CORS requests are not allowed for this Organization',
          )
        ) {
          throw new LLMAPIKeyInvalidException(
            `Provider ${this.provider.id} is experiencing a CORS issue. This is a known issue with new individual Anthropic accounts.

To resolve this issue:

1. Go to https://console.anthropic.com/settings/organization
2. Create a new organization
3. Your API key should work properly after creating an organization

For more information, please refer to the following issue:
https://github.com/glowingjade/obsidian-smart-composer/issues/286`,
            error,
          )
        }
        throw new LLMAPIKeyInvalidException(
          `Provider ${this.provider.id} API key is invalid. Please update it in settings menu.`,
          error,
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
            .map((m) => AnthropicProvider.parseRequestMessage(m))
            .filter((m) => m !== null),
          system: systemMessage,
          thinking: model.thinking?.enabled
            ? {
                type: 'enabled',
                budget_tokens: model.thinking.budget_tokens,
              }
            : undefined,
          tools: request.tools?.map((t) =>
            AnthropicProvider.parseRequestTool(t),
          ),
          tool_choice: request.tool_choice
            ? AnthropicProvider.parseRequestToolChoice(request.tool_choice)
            : undefined,
          max_tokens:
            request.max_tokens ??
            (model.thinking?.enabled
              ? model.thinking?.budget_tokens +
                AnthropicProvider.DEFAULT_MAX_TOKENS
              : AnthropicProvider.DEFAULT_MAX_TOKENS),
          temperature: request.temperature,
          top_p: request.top_p,
          stream: true,
        },
        {
          signal: options?.signal,
        },
      )

      return AnthropicProvider.streamResponseGenerator(stream)
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        // Anthropic's CORS Policy Change (March 2025)
        // Issue: https://github.com/glowingjade/obsidian-smart-composer/issues/286
        //
        // Anthropic recently changed their CORS policy for new individual accounts:
        // - New individual accounts now have CORS restrictions by default
        // - The error occurs even with valid API keys and anthropic-dangerous-direct-browser-access: true
        // - The error message contains "CORS requests are not allowed for this Organization"
        //
        // Solution: Users need to create an organization in their Anthropic account
        if (
          error.message.includes(
            'CORS requests are not allowed for this Organization',
          )
        ) {
          throw new LLMAPIKeyInvalidException(
            `Provider ${this.provider.id} is experiencing a CORS issue. This is a known issue with new individual Anthropic accounts.

To resolve this issue:

1. Go to https://console.anthropic.com/settings/organization
2. Create a new organization
3. Your API key should work properly after creating an organization

For more information, please refer to the following issue:
https://github.com/glowingjade/obsidian-smart-composer/issues/286`,
            error,
          )
        }
        throw new LLMAPIKeyInvalidException(
          `Provider ${this.provider.id} API key is invalid. Please update it in settings menu.`,
          error,
        )
      }

      throw error
    }
  }

  static async *streamResponseGenerator(
    stream: AsyncIterable<MessageStreamEvent>,
  ): AsyncIterable<LLMResponseStreaming> {
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
      } else if (
        chunk.type === 'content_block_start' ||
        chunk.type === 'content_block_delta'
      ) {
        const parsedChunk = AnthropicProvider.parseStreamingResponseChunk(
          chunk,
          messageId,
          model,
        )
        if (parsedChunk !== null) {
          yield parsedChunk
        }
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

  static parseRequestMessage(message: RequestMessage): MessageParam | null {
    switch (message.role) {
      case 'user': {
        if (Array.isArray(message.content)) {
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
                      media_type: mimeType as Base64ImageSource['media_type'],
                      type: 'base64',
                    },
                  }
                }
              }
            },
          )
          return { role: 'user', content }
        }
        return { role: 'user', content: message.content }
      }
      case 'assistant': {
        const anthropicToolCalls = message.tool_calls?.map(
          (toolCall): ContentBlockParam => {
            const parsedArgs = (() => {
              if (toolCall.arguments && toolCall.arguments.length > 0) {
                try {
                  return JSON.parse(toolCall.arguments) as unknown
                } catch (error) {
                  return {}
                }
              }
              return {}
            })()

            return {
              type: 'tool_use' as const,
              id: toolCall.id,
              name: toolCall.name,
              input: parsedArgs,
            }
          },
        )

        const messageContent = [
          ...(message.content.trim() === ''
            ? []
            : [
                {
                  type: 'text' as const,
                  text: message.content,
                },
              ]),
          ...(anthropicToolCalls ? anthropicToolCalls : []),
        ]

        if (messageContent.length === 0) {
          // No content or tool calls, skip the message
          return null
        }

        return { role: 'assistant', content: messageContent }
      }
      case 'system': {
        // System messages should be extracted and handled separately
        return null
      }
      case 'tool': {
        return {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: message.tool_call.id,
              content: message.content,
            },
          ],
        }
      }
    }
  }

  static parseNonStreamingResponse(
    response: Anthropic.Message,
  ): LLMResponseNonStreaming {
    const textContent = response.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('')

    const reasoningContent =
      response.content
        .filter((c) => c.type === 'thinking')
        .map((c) => c.thinking)
        .join('') || undefined

    const toolCalls: ToolCall[] = response.content
      .filter((c) => c.type === 'tool_use')
      .map((c): ToolCall => {
        return {
          id: c.id,
          type: 'function',
          function: {
            name: c.name,
            arguments: JSON.stringify(c.input),
          },
        }
      })

    return {
      id: response.id,
      choices: [
        {
          finish_reason: response.stop_reason,
          message: {
            content: textContent,
            reasoning: reasoningContent,
            tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
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
  ): LLMResponseStreaming | null {
    if (
      chunk.type !== 'content_block_start' &&
      chunk.type !== 'content_block_delta'
    ) {
      throw new Error('Unsupported chunk type')
    }

    if (chunk.type === 'content_block_start') {
      if (chunk.content_block.type === 'tool_use') {
        return {
          id: messageId,
          choices: [
            {
              finish_reason: null,
              delta: {
                tool_calls: [
                  {
                    index: chunk.index,
                    id: chunk.content_block.id,
                    type: 'function',
                    function: {
                      name: chunk.content_block.name,
                      // arguments are not provided in the start event
                    },
                  },
                ],
              },
            },
          ],
          object: 'chat.completion.chunk',
          model: model,
        }
      }
    }

    if (chunk.type === 'content_block_delta') {
      if (chunk.delta.type === 'text_delta') {
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
      } else if (chunk.delta.type === 'thinking_delta') {
        return {
          id: messageId,
          choices: [
            {
              finish_reason: null,
              delta: {
                reasoning: chunk.delta.thinking,
              },
            },
          ],
          object: 'chat.completion.chunk',
          model: model,
        }
      } else if (chunk.delta.type === 'input_json_delta') {
        return {
          id: messageId,
          choices: [
            {
              finish_reason: null,
              delta: {
                tool_calls: [
                  {
                    index: chunk.index,
                    function: {
                      arguments: chunk.delta.partial_json,
                    },
                  },
                ],
              },
            },
          ],
          object: 'chat.completion.chunk',
          model: model,
        }
      }
    }
    return null
  }

  static validateSystemMessages(
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

  static parseRequestTool(tool: RequestTool): AnthropicTool {
    return {
      name: tool.function.name,
      input_schema: {
        ...tool.function.parameters,
        type: 'object',
      },
      description: tool.function.description,
    }
  }

  static parseRequestToolChoice(
    toolChoice: RequestToolChoice,
  ): AnthropicToolChoice {
    if (toolChoice === 'none') {
      return {
        type: 'none',
      }
    }
    if (toolChoice === 'auto') {
      return {
        type: 'auto',
      }
    }
    if (toolChoice === 'required') {
      return {
        type: 'any',
      }
    }
    if (typeof toolChoice === 'object' && toolChoice.type === 'function') {
      return {
        type: 'tool',
        name: toolChoice.function.name,
      }
    }
    throw new Error(`Unsupported tool choice: ${JSON.stringify(toolChoice)}`)
  }

  async getEmbedding(_model: string, _text: string): Promise<number[]> {
    throw new Error(
      `Provider ${this.provider.id} does not support embeddings. Please use a different provider.`,
    )
  }
}
