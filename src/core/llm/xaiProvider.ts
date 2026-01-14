import OpenAI from 'openai'

import { ChatModel } from '../../types/chat-model.types'
import {
  LLMOptions,
  LLMRequestNonStreaming,
  LLMRequestStreaming,
} from '../../types/llm/request'
import {
  LLMResponseNonStreaming,
  LLMResponseStreaming,
} from '../../types/llm/response'
import { LLMProvider } from '../../types/provider.types'

import { BaseLLMProvider } from './base'
import { OpenAIMessageAdapter } from './openaiMessageAdapter'

export class XaiProvider extends BaseLLMProvider<
  Extract<LLMProvider, { type: 'xai' }>
> {
  private adapter: OpenAIMessageAdapter
  private client: OpenAI

  constructor(provider: Extract<LLMProvider, { type: 'xai' }>) {
    super(provider)
    this.adapter = new OpenAIMessageAdapter()
    this.client = new OpenAI({
      apiKey: provider.apiKey ?? '',
      baseURL: provider.baseUrl
        ? provider.baseUrl.replace(/\/+$/, '')
        : 'https://api.x.ai/v1',
      dangerouslyAllowBrowser: true,
    })
  }

  async generateResponse(
    model: ChatModel,
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (model.providerType !== 'xai') {
      throw new Error('Model is not an xAI model')
    }

    return this.adapter.generateResponse(this.client, request, options)
  }

  async streamResponse(
    model: ChatModel,
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    if (model.providerType !== 'xai') {
      throw new Error('Model is not an xAI model')
    }

    return this.adapter.streamResponse(this.client, request, options)
  }

  async getEmbedding(_model: string, _text: string): Promise<number[]> {
    throw new Error(
      `Provider ${String(this.provider.id)} does not support embeddings. Please use a different provider.`,
    )
  }
}
