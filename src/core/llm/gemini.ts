import OpenAI from 'openai'

import {
  LLMOptions,
  LLMRequestNonStreaming,
  LLMRequestStreaming,
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
import {
  NoStainlessOpenAI,
  OpenAICompatibleProvider,
} from './openaiCompatibleProvider'

export type GeminiModel =
  | 'gemini-1.5-pro'
  | 'gemini-1.5-flash'
  | 'gemini-1.5-flash-8b'
export const GEMINI_MODELS: GeminiModel[] = [
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
]

export class GeminiProvider implements BaseLLMProvider {
  private provider: OpenAICompatibleProvider

  private static readonly ERRORS = {
    API_KEY_MISSING:
      'Gemini API key is missing. Please set it in settings menu.',
    API_KEY_INVALID:
      'Gemini API key is invalid. Please update it in settings menu.',
    MODEL_NOT_SUPPORTED: (model: string) =>
      `Gemini model ${model} is not supported.`,
  } as const

  constructor(apiKey: string) {
    this.provider = new OpenAICompatibleProvider(
      new NoStainlessOpenAI({
        apiKey,
        dangerouslyAllowBrowser: true,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      }),
    )
  }

  async generateResponse(
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (!this.provider.getApiKey()) {
      throw new LLMAPIKeyNotSetException(GeminiProvider.ERRORS.API_KEY_MISSING)
    }

    if (!GEMINI_MODELS.includes(request.model as GeminiModel)) {
      throw new LLMModelNotSupportedException(
        GeminiProvider.ERRORS.MODEL_NOT_SUPPORTED(request.model),
      )
    }

    try {
      return this.provider.generateResponse(request, options)
    } catch (error) {
      // TODO: Update invalid API key handling for Gemini API
      // Currently, Gemini API works with invalid API keys...
      if (error instanceof OpenAI.AuthenticationError) {
        throw new LLMAPIKeyInvalidException(
          GeminiProvider.ERRORS.API_KEY_INVALID,
        )
      }
      throw error
    }
  }

  async streamResponse(
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    if (!this.provider.getApiKey()) {
      throw new LLMAPIKeyNotSetException(GeminiProvider.ERRORS.API_KEY_MISSING)
    }

    if (!GEMINI_MODELS.includes(request.model as GeminiModel)) {
      throw new LLMModelNotSupportedException(
        GeminiProvider.ERRORS.MODEL_NOT_SUPPORTED(request.model),
      )
    }

    try {
      return this.provider.streamResponse(request, options)
    } catch (error) {
      // TODO: Update invalid API key handling for Gemini API
      // Currently, Gemini API works with invalid API keys...
      if (error instanceof OpenAI.AuthenticationError) {
        throw new LLMAPIKeyInvalidException(
          GeminiProvider.ERRORS.API_KEY_INVALID,
        )
      }
      throw error
    }
  }

  getSupportedModels(): string[] {
    return GEMINI_MODELS
  }
}
