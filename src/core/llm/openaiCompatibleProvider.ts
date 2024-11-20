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
import { OpenAIMessageAdapter } from './openaiMessageAdapter'

export class OpenAICompatibleProvider implements BaseLLMProvider {
  private provider: OpenAIMessageAdapter

  constructor() {
    this.provider = new OpenAIMessageAdapter()
  }

  async generateResponse(
    model: OpenAICompatibleModel,
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    const client = new OpenAI({
      apiKey: model.apiKey,
      baseURL: model.baseURL,
      dangerouslyAllowBrowser: true,
    })
    return this.provider.generateResponse(client, request, options)
  }

  async streamResponse(
    model: OpenAICompatibleModel,
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    const client = new OpenAI({
      apiKey: model.apiKey,
      baseURL: model.baseURL,
      dangerouslyAllowBrowser: true,
    })
    return this.provider.streamResponse(client, request, options)
  }
}
