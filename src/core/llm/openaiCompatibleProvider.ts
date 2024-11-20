import OpenAI from 'openai'

import { OpenAICompatibleModel } from '../../types/llm/model'
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
import { LLMBaseUrlNotSetException } from './exception'
import { OpenAIMessageAdapter } from './openaiMessageAdapter'

export class OpenAICompatibleProvider implements BaseLLMProvider {
  private adapter: OpenAIMessageAdapter

  constructor() {
    this.adapter = new OpenAIMessageAdapter()
  }

  async generateResponse(
    model: OpenAICompatibleModel,
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (!model.baseURL) {
      throw new LLMBaseUrlNotSetException(
        'OpenAI Compatible base URL is missing. Please set it in settings menu.',
      )
    }

    const client = new OpenAI({
      apiKey: model.apiKey,
      baseURL: model.baseURL,
      dangerouslyAllowBrowser: true,
    })
    return this.adapter.generateResponse(client, request, options)
  }

  async streamResponse(
    model: OpenAICompatibleModel,
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    if (!model.baseURL) {
      throw new LLMBaseUrlNotSetException(
        'OpenAI Compatible base URL is missing. Please set it in settings menu.',
      )
    }

    const client = new OpenAI({
      apiKey: model.apiKey,
      baseURL: model.baseURL,
      dangerouslyAllowBrowser: true,
    })
    return this.adapter.streamResponse(client, request, options)
  }
}
