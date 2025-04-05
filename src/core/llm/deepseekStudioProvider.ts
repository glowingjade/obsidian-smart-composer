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
import { formatMessages } from '../../utils/llm/request'

import { BaseLLMProvider } from './base'
import { DeepSeekMessageAdapter } from './deepseekMessageAdapter'

// deepseek doesn't support image
export class DeepSeekStudioProvider extends BaseLLMProvider<
  Extract<LLMProvider, { type: 'deepseek' }>
> {
  private adapter: DeepSeekMessageAdapter
  private client: OpenAI

  constructor(provider: Extract<LLMProvider, { type: 'deepseek' }>) {
    super(provider)
    this.adapter = new DeepSeekMessageAdapter()
    this.client = new OpenAI({
      apiKey: provider.apiKey ?? '',
      baseURL: provider.baseUrl
        ? provider.baseUrl.replace(/\/+$/, '')
        : 'https://api.deepseek.com',
      dangerouslyAllowBrowser: true,
    })
  }

  async generateResponse(
    model: ChatModel,
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (model.providerType !== 'deepseek') {
      throw new Error('Model is not a DeepSeek model')
    }

    const formattedRequest = {
      ...request,
      messages: formatMessages(request.messages),
    }

    return this.adapter.generateResponse(this.client, formattedRequest, options)
  }

  async streamResponse(
    model: ChatModel,
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    if (model.providerType !== 'deepseek') {
      throw new Error('Model is not a DeepSeek model')
    }

    const formattedRequest = {
      ...request,
      messages: formatMessages(request.messages),
    }

    return this.adapter.streamResponse(this.client, formattedRequest, options)
  }

  async getEmbedding(_model: string, _text: string): Promise<number[]> {
    throw new Error(
      `Provider ${this.provider.id} does not support embeddings. Please use a different provider.`,
    )
  }
}
