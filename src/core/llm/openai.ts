import OpenAI from 'openai'

import { LLMModel } from '../../types/llm/model'
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
import { OpenAIMessageAdapter } from './openaiMessageAdapter'

export class OpenAIAuthenticatedProvider implements BaseLLMProvider {
  private adapter: OpenAIMessageAdapter
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
    this.adapter = new OpenAIMessageAdapter()
  }

  async generateResponse(
    model: LLMModel,
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (!this.client.apiKey) {
      throw new LLMAPIKeyNotSetException(
        'OpenAI API key is missing. Please set it in settings menu.',
      )
    }
    try {
      return this.adapter.generateResponse(this.client, request, options)
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
    model: LLMModel,
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    if (!this.client.apiKey) {
      throw new LLMAPIKeyNotSetException(
        'OpenAI API key is missing. Please set it in settings menu.',
      )
    }

    try {
      return this.adapter.streamResponse(this.client, request, options)
    } catch (error) {
      if (error instanceof OpenAI.AuthenticationError) {
        throw new LLMAPIKeyInvalidException(
          'OpenAI API key is invalid. Please update it in settings menu.',
        )
      }
      throw error
    }
  }
}
