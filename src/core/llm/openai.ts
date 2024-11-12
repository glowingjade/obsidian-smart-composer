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
import { OpenAICompatibleProvider } from './openaiCompatibleProvider'

export type OpenAIModel = 'gpt-4o' | 'gpt-4o-mini'
export const OPENAI_MODELS: OpenAIModel[] = ['gpt-4o', 'gpt-4o-mini']

export class OpenAIAuthenticatedProvider implements BaseLLMProvider {
  private provider: OpenAICompatibleProvider
  private client: OpenAI

  private static readonly ERRORS = {
    API_KEY_MISSING:
      'OpenAI API key is missing. Please set it in settings menu.',
    API_KEY_INVALID:
      'OpenAI API key is invalid. Please update it in settings menu.',
    MODEL_NOT_SUPPORTED: (model: string) =>
      `OpenAI model ${model} is not supported.`,
  } as const

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
    this.provider = new OpenAICompatibleProvider(this.client)
  }

  async generateResponse(
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (!this.client.apiKey) {
      throw new LLMAPIKeyNotSetException(
        OpenAIAuthenticatedProvider.ERRORS.API_KEY_MISSING,
      )
    }

    if (!OPENAI_MODELS.includes(request.model as OpenAIModel)) {
      throw new LLMModelNotSupportedException(
        OpenAIAuthenticatedProvider.ERRORS.MODEL_NOT_SUPPORTED(request.model),
      )
    }

    try {
      return this.provider.generateResponse(request, options)
    } catch (error) {
      if (error instanceof OpenAI.AuthenticationError) {
        throw new LLMAPIKeyInvalidException(
          OpenAIAuthenticatedProvider.ERRORS.API_KEY_INVALID,
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
        OpenAIAuthenticatedProvider.ERRORS.API_KEY_MISSING,
      )
    }

    if (!OPENAI_MODELS.includes(request.model as OpenAIModel)) {
      throw new LLMModelNotSupportedException(
        OpenAIAuthenticatedProvider.ERRORS.MODEL_NOT_SUPPORTED(request.model),
      )
    }

    try {
      return this.provider.streamResponse(request, options)
    } catch (error) {
      if (error instanceof OpenAI.AuthenticationError) {
        throw new LLMAPIKeyInvalidException(
          OpenAIAuthenticatedProvider.ERRORS.API_KEY_INVALID,
        )
      }
      throw error
    }
  }

  getSupportedModels(): string[] {
    return OPENAI_MODELS
  }
}
