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
} from './exception'
import { OpenAICompatibleProvider } from './openaiCompatibleProvider'

export type OpenAIModel = 'gpt-4o' | 'gpt-4o-mini'
export const OPENAI_MODELS: OpenAIModel[] = ['gpt-4o', 'gpt-4o-mini']

export class OpenAIAuthenticatedProvider implements BaseLLMProvider {
  private provider: OpenAICompatibleProvider
  private client: OpenAI

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
        'OpenAI API key is missing. Please set it in settings menu.',
      )
    }
    try {
      return this.provider.generateResponse(request, options)
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
      return this.provider.streamResponse(request, options)
    } catch (error) {
      if (error instanceof OpenAI.AuthenticationError) {
        throw new LLMAPIKeyInvalidException(
          'OpenAI API key is invalid. Please update it in settings menu.',
        )
      }
      throw error
    }
  }

  getSupportedModels(): string[] {
    return OPENAI_MODELS
  }
}
