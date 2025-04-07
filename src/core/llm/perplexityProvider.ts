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
import { NoStainlessOpenAI } from './NoStainlessOpenAI'
import { PerplexityMessageAdapter } from './perplexityMessageAdapter'

export class PerplexityProvider extends BaseLLMProvider<
  Extract<LLMProvider, { type: 'perplexity' }>
> {
  private adapter: PerplexityMessageAdapter
  private client: NoStainlessOpenAI

  constructor(provider: Extract<LLMProvider, { type: 'perplexity' }>) {
    super(provider)
    this.adapter = new PerplexityMessageAdapter()
    this.client = new NoStainlessOpenAI({
      apiKey: provider.apiKey ?? '',
      baseURL: provider.baseUrl
        ? provider.baseUrl.replace(/\/+$/, '')
        : 'https://api.perplexity.ai',
      dangerouslyAllowBrowser: true,
    })
  }

  async generateResponse(
    model: ChatModel,
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (model.providerType !== 'perplexity') {
      throw new Error('Model is not a Perplexity model')
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
    if (model.providerType !== 'perplexity') {
      throw new Error('Model is not a Perplexity model')
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
