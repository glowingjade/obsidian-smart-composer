import {
  Content,
  EnhancedGenerateContentResponse,
  FunctionCallPart,
  Tool as GeminiTool,
  GenerateContentResult,
  GenerateContentStreamResult,
  GoogleGenerativeAI,
  Part,
  Schema,
  SchemaType,
} from '@google/generative-ai'
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
 * TODO: Consider future migration from '@google/generative-ai' to '@google/genai' (https://github.com/googleapis/js-genai)
 * - Current '@google/generative-ai' library will not support newest models and features
 * - Not migrating yet as '@google/genai' is still in preview status
 */

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
  private client: GoogleGenerativeAI
  private apiKey: string

  constructor(provider: Extract<LLMProvider, { type: 'gemini' }>) {
    super(provider)
    if (provider.baseUrl) {
      throw new Error('Gemini does not support custom base URL')
    }

    this.client = new GoogleGenerativeAI(provider.apiKey ?? '')
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
          tools: request.tools?.map((tool) =>
            GeminiProvider.parseRequestTool(tool),
          ),
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
          tools: request.tools?.map((tool) =>
            GeminiProvider.parseRequestTool(tool),
          ),
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
          `Gemini API key is invalid. Please update it in settings menu.`,
          error as Error,
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
        const contentParts: Part[] = [
          ...(message.content === '' ? [] : [{ text: message.content }]),
          ...(message.tool_calls?.map((toolCall): FunctionCallPart => {
            try {
              const args = JSON.parse(toolCall.arguments ?? '{}')
              return {
                functionCall: {
                  name: toolCall.name,
                  args,
                },
              }
            } catch (error) {
              // If the arguments are not valid JSON, return an empty object
              return {
                functionCall: {
                  name: toolCall.name,
                  args: {},
                },
              }
            }
          }) ?? []),
        ]

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
            tool_calls: response.response.functionCalls()?.map((f) => ({
              id: uuidv4(),
              type: 'function',
              function: {
                name: f.name,
                arguments: JSON.stringify(f.args),
              },
            })),
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
            tool_calls: chunk.functionCalls()?.map((f, index) => ({
              index,
              id: uuidv4(),
              type: 'function',
              function: {
                name: f.name,
                arguments: JSON.stringify(f.args),
              },
            })),
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

 private static parseRequestTool(tool: RequestTool): GeminiTool {
  // Get the original properties defined in Smart Composer's RequestTool structure.
  // Default to an empty object if properties are not defined.
  const originalParameterProperties = tool.function.parameters?.properties ?? {};
  
  // Create a new object to hold the sanitized properties that will be sent to Gemini.
  const sanitizedParameterProperties: Record<string, Schema> = {};

  // Iterate over each parameter defined in the original tool properties.
  for (const paramName in originalParameterProperties) {
    // Ensure we are only processing own properties of the object.
    if (Object.prototype.hasOwnProperty.call(originalParameterProperties, paramName)) {
      
      const originalParamSchemaSource = originalParameterProperties[paramName] as any; 
      const newParamSchema: Schema = { ...originalParamSchemaSource }; // Shallow clone

      // CHECK AND SANITIZE THE 'format' FIELD FOR STRING TYPES:
      // 1. Ensure the parameter type is STRING.
      //    (Verify 'SchemaType.STRING' is correct from your '@google/generative-ai' imports; it might be "STRING").
      // 2. Ensure the 'format' field actually exists on the schema.
      if (newParamSchema.type === SchemaType.STRING && 
          Object.prototype.hasOwnProperty.call(newParamSchema, 'format') &&
          newParamSchema.format !== undefined && newParamSchema.format !== null) {
        
        const currentFormat = String(newParamSchema.format).toLowerCase();

        if (currentFormat !== 'enum' && currentFormat !== 'date-time') {
          // If format exists and is NOT 'enum' or 'date-time', delete it.
          delete newParamSchema.format;
        }
      }
      
      sanitizedParameterProperties[paramName] = newParamSchema;
    }
  }

  // Get the 'required' parameters list from the original tool definition.
  const requiredParams = tool.function.parameters?.required ?? [];

  // Construct and return the GeminiTool object with the sanitized properties.
  return {
    functionDeclarations: [
      {
        name: tool.function.name,
        description: tool.function.description,
        parameters: {
          type: SchemaType.OBJECT, 
          properties: sanitizedParameterProperties, // Use the sanitized properties.
          required: requiredParams.length > 0 ? requiredParams : undefined,
        },
      },
    ],
  };
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

  async getEmbedding(model: string, text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new LLMAPIKeyNotSetException(
        `Provider ${this.provider.id} API key is missing. Please set it in settings menu.`,
      )
    }

    try {
      const response = await this.client
        .getGenerativeModel({ model: model })
        .embedContent(text)
      return response.embedding.values
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
