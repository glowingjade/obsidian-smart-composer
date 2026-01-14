import {
  Content,
  FunctionCall,
  GenerateContentResponse,
  GoogleGenAI,
  Part,
  Schema,
  ThinkingConfig,
  ThinkingLevel,
  Tool,
  Type,
} from '@google/genai'
import { v4 as uuidv4 } from 'uuid'

import { ChatModel } from '../../types/chat-model.types'
import {
  LLMOptions,
  LLMRequestNonStreaming,
  LLMRequestStreaming,
  RequestMessage,
  RequestTool,
} from '../../types/llm/request'
import {
  LLMResponseNonStreaming,
  LLMResponseStreaming,
} from '../../types/llm/response'
import { LLMProvider } from '../../types/provider.types'
import { parseImageDataUrl } from '../../utils/llm/image'

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
  private client: GoogleGenAI
  private apiKey: string

  constructor(provider: Extract<LLMProvider, { type: 'gemini' }>) {
    super(provider)
    if (provider.baseUrl) {
      throw new Error('Gemini does not support custom base URL')
    }

    this.client = new GoogleGenAI({ apiKey: provider.apiKey ?? '' })
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
      const result = await this.client.models.generateContent({
        model: request.model,
        contents: request.messages
          .map((message) => GeminiProvider.parseRequestMessage(message))
          .filter((m): m is Content => m !== null),
        config: {
          maxOutputTokens: request.max_tokens,
          temperature: request.temperature,
          topP: request.top_p,
          presencePenalty: request.presence_penalty,
          frequencyPenalty: request.frequency_penalty,
          systemInstruction: systemInstruction,
          abortSignal: options?.signal,
          tools: request.tools?.map((tool) =>
            GeminiProvider.parseRequestTool(tool),
          ),
          thinkingConfig: GeminiProvider.buildThinkingConfig(model),
        },
      })

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
          error as Error,
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
      const stream = await this.client.models.generateContentStream({
        model: request.model,
        contents: request.messages
          .map((message) => GeminiProvider.parseRequestMessage(message))
          .filter((m): m is Content => m !== null),
        config: {
          maxOutputTokens: request.max_tokens,
          temperature: request.temperature,
          topP: request.top_p,
          presencePenalty: request.presence_penalty,
          frequencyPenalty: request.frequency_penalty,
          systemInstruction: systemInstruction,
          abortSignal: options?.signal,
          tools: request.tools?.map((tool) =>
            GeminiProvider.parseRequestTool(tool),
          ),
          thinkingConfig: GeminiProvider.buildThinkingConfig(model),
        },
      })

      const messageId = crypto.randomUUID() // Gemini does not return a message id
      return this.streamResponseGenerator(stream, request.model, messageId)
    } catch (error) {
      const isInvalidApiKey =
        error.message?.includes('API_KEY_INVALID') ||
        error.message?.includes('API key not valid')

      if (isInvalidApiKey) {
        throw new LLMAPIKeyInvalidException(
          `Gemini API key is invalid. Please update it in settings menu.`,
          error as Error,
        )
      }

      throw error
    }
  }

  private async *streamResponseGenerator(
    stream: AsyncGenerator<GenerateContentResponse>,
    model: string,
    messageId: string,
  ): AsyncIterable<LLMResponseStreaming> {
    for await (const chunk of stream) {
      yield GeminiProvider.parseStreamingResponseChunk(chunk, model, messageId)
    }
  }

  static parseRequestMessage(message: RequestMessage): Content | null {
    switch (message.role) {
      case 'system':
        // System messages should be extracted and handled separately
        return null
      case 'user': {
        const contentParts: Part[] = Array.isArray(message.content)
          ? message.content.map((part) => {
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
            })
          : [{ text: message.content }]

        return {
          role: 'user',
          parts: contentParts,
        }
      }
      case 'assistant': {
        const thoughtSignature =
          message.providerMetadata?.gemini?.thoughtSignature
        const hasToolCalls = message.tool_calls && message.tool_calls.length > 0

        const contentParts: Part[] = []

        // Add text content part
        if (message.content !== '') {
          // If no tool calls and we have a signature, attach it to the text part
          if (!hasToolCalls && thoughtSignature) {
            contentParts.push({ text: message.content, thoughtSignature })
          } else {
            contentParts.push({ text: message.content })
          }
        }

        // Add function call parts
        if (message.tool_calls) {
          message.tool_calls.forEach((toolCall, index) => {
            let args: Record<string, unknown>
            try {
              args = JSON.parse(toolCall.arguments ?? '{}')
            } catch {
              args = {}
            }

            const part: Part = {
              functionCall: {
                name: toolCall.name,
                args,
              },
            }

            // Attach signature to the first function call part
            if (index === 0 && thoughtSignature) {
              part.thoughtSignature = thoughtSignature
            }

            contentParts.push(part)
          })
        }

        if (contentParts.length === 0) {
          return null
        }

        return {
          role: 'model',
          parts: contentParts,
        }
      }
      case 'tool': {
        return {
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: message.tool_call.name,
                response: { result: message.content }, // Gemini requires a response object
              },
            },
          ],
        }
      }
    }
  }

  static parseNonStreamingResponse(
    response: GenerateContentResponse,
    model: string,
    messageId: string,
  ): LLMResponseNonStreaming {
    const parts = response.candidates?.[0]?.content?.parts
    const thoughtSignature = GeminiProvider.extractThoughtSignature(parts)
    const reasoning = GeminiProvider.extractThoughtSummaries(parts)

    return {
      id: messageId,
      choices: [
        {
          finish_reason: response.candidates?.[0]?.finishReason ?? null,
          message: {
            content: response.text ?? '',
            reasoning: reasoning,
            role: 'assistant',
            tool_calls: GeminiProvider.parseFunctionCalls(
              response.functionCalls,
            ),
            providerMetadata: thoughtSignature
              ? { gemini: { thoughtSignature } }
              : undefined,
          },
        },
      ],
      created: Date.now(),
      model: model,
      object: 'chat.completion',
      usage: response.usageMetadata
        ? {
            prompt_tokens: response.usageMetadata.promptTokenCount ?? 0,
            completion_tokens: response.usageMetadata.candidatesTokenCount ?? 0,
            total_tokens: response.usageMetadata.totalTokenCount ?? 0,
          }
        : undefined,
    }
  }

  static parseStreamingResponseChunk(
    chunk: GenerateContentResponse,
    model: string,
    messageId: string,
  ): LLMResponseStreaming {
    const parts = chunk.candidates?.[0]?.content?.parts
    const thoughtSignature = GeminiProvider.extractThoughtSignature(parts)
    const reasoning = GeminiProvider.extractThoughtSummaries(parts)

    return {
      id: messageId,
      choices: [
        {
          finish_reason: chunk.candidates?.[0]?.finishReason ?? null,
          delta: {
            content: chunk.text ?? null,
            reasoning: reasoning,
            tool_calls: GeminiProvider.parseFunctionCallsForStreaming(
              chunk.functionCalls,
            ),
            providerMetadata: thoughtSignature
              ? { gemini: { thoughtSignature } }
              : undefined,
          },
        },
      ],
      created: Date.now(),
      model: model,
      object: 'chat.completion.chunk',
      usage: chunk.usageMetadata
        ? {
            prompt_tokens: chunk.usageMetadata.promptTokenCount ?? 0,
            completion_tokens: chunk.usageMetadata.candidatesTokenCount ?? 0,
            total_tokens: chunk.usageMetadata.totalTokenCount ?? 0,
          }
        : undefined,
    }
  }

  private static parseFunctionCalls(functionCalls: FunctionCall[] | undefined) {
    return functionCalls?.map((f) => ({
      id: f.id ?? uuidv4(),
      type: 'function' as const,
      function: {
        name: f.name ?? '',
        arguments: JSON.stringify(f.args ?? {}),
      },
    }))
  }

  private static parseFunctionCallsForStreaming(
    functionCalls: FunctionCall[] | undefined,
  ) {
    return functionCalls?.map((f, index) => ({
      index,
      id: f.id ?? uuidv4(),
      type: 'function' as const,
      function: {
        name: f.name ?? '',
        arguments: JSON.stringify(f.args ?? {}),
      },
    }))
  }

  /**
   * Extracts the thought signature from Gemini response parts.
   * Per Gemini docs:
   * - With function calls: signature is on the first functionCall part
   * - Without function calls: signature is on the last part
   */
  private static extractThoughtSignature(
    parts: Part[] | undefined,
  ): string | undefined {
    if (!parts || parts.length === 0) {
      return undefined
    }

    // Check if there are function calls
    const hasFunctionCalls = parts.some((part) => part.functionCall)

    if (hasFunctionCalls) {
      // Signature is on the first function call part
      const firstFcPart = parts.find((part) => part.functionCall)
      return firstFcPart?.thoughtSignature
    } else {
      // Signature is on the last part
      const lastPart = parts[parts.length - 1]
      return lastPart?.thoughtSignature
    }
  }

  /**
   * Extracts thought summaries from Gemini response parts.
   * Thought summaries are parts with thought: true and contain reasoning text.
   */
  private static extractThoughtSummaries(
    parts: Part[] | undefined,
  ): string | undefined {
    if (!parts || parts.length === 0) {
      return undefined
    }

    const thoughtParts = parts.filter((part) => part.thought && part.text)
    if (thoughtParts.length === 0) {
      return undefined
    }

    return thoughtParts.map((part) => part.text).join('')
  }

  private static removeAdditionalProperties(schema: unknown): unknown {
    // TODO: Remove this function when Gemini supports additionalProperties field in JSON schema
    if (typeof schema !== 'object' || schema === null) {
      return schema
    }

    if (Array.isArray(schema)) {
      return schema.map((item) => this.removeAdditionalProperties(item))
    }

    const { additionalProperties: _, ...rest } = schema as Record<
      string,
      unknown
    >

    return Object.fromEntries(
      Object.entries(rest).map(([key, value]) => [
        key,
        this.removeAdditionalProperties(value),
      ]),
    )
  }

  private static parseRequestTool(tool: RequestTool): Tool {
    // Gemini does not support additionalProperties field in JSON schema, so we need to clean it
    const cleanedParameters = this.removeAdditionalProperties(
      tool.function.parameters,
    ) as Record<string, unknown>

    return {
      functionDeclarations: [
        {
          name: tool.function.name,
          description: tool.function.description,
          parameters: {
            type: Type.OBJECT,
            properties: cleanedParameters.properties as Record<string, Schema>,
          },
        },
      ],
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

  private static readonly THINKING_LEVEL_MAP: Record<string, ThinkingLevel> = {
    minimal: ThinkingLevel.MINIMAL,
    low: ThinkingLevel.LOW,
    medium: ThinkingLevel.MEDIUM,
    high: ThinkingLevel.HIGH,
  }

  /**
   * Builds the thinking config for Gemini API based on model settings.
   * - Gemini 3 models use thinkingLevel
   * - Gemini 2.5 models use thinkingBudget
   */
  private static buildThinkingConfig(
    model: ChatModel & { providerType: 'gemini' },
  ): ThinkingConfig | undefined {
    if (!model.thinking?.enabled) {
      return undefined
    }

    const config: ThinkingConfig = {}

    if (model.thinking.thinking_level) {
      const level = this.THINKING_LEVEL_MAP[model.thinking.thinking_level]
      if (level) {
        config.thinkingLevel = level
      }
    }

    if (model.thinking.thinking_budget !== undefined) {
      config.thinkingBudget = model.thinking.thinking_budget
    }

    if (model.thinking.include_thoughts) {
      config.includeThoughts = model.thinking.include_thoughts
    }

    return config
  }

  async getEmbedding(model: string, text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new LLMAPIKeyNotSetException(
        `Provider ${this.provider.id} API key is missing. Please set it in settings menu.`,
      )
    }

    try {
      const response = await this.client.models.embedContent({
        model: model,
        contents: text,
      })
      return response.embeddings?.[0]?.values ?? []
    } catch (error) {
      if (error.status === 429) {
        throw new LLMRateLimitExceededException(
          'Gemini API rate limit exceeded. Please try again later.',
        )
      }
      throw error
    }
  }
}
