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
import { NoStainlessOpenAI } from './NoStainlessOpenAI'
import { OpenAIMessageAdapter } from './openaiMessageAdapter'

export class MorphProvider extends BaseLLMProvider<
  Extract<LLMProvider, { type: 'morph' }>
> {
  private adapter: OpenAIMessageAdapter
  private client: NoStainlessOpenAI

  constructor(provider: Extract<LLMProvider, { type: 'morph' }>) {
    super(provider)
    this.adapter = new OpenAIMessageAdapter()
    this.client = new NoStainlessOpenAI({
      baseURL: `${provider.baseUrl ? provider.baseUrl.replace(/\/+$/, '') : 'https://api.morphllm.com'}/v1`,
      apiKey: provider.apiKey ?? '',
      dangerouslyAllowBrowser: true,
    })
  }

  async generateResponse(
    model: ChatModel,
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (model.providerType !== 'morph') {
      throw new Error('Model is not an morph model')
    }

    return this.adapter.generateResponse(
      this.client,
      {
        ...request,
        prediction: undefined, // morph doesn't support prediction
      },
      options,
    )
  }

  async streamResponse(
    model: ChatModel,
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    if (model.providerType !== 'morph') {
      throw new Error('Model is not an morph model')
    }

    return this.adapter.streamResponse(
      this.client,
      {
        ...request,
        prediction: undefined, // morph doesn't support prediction
      },
      options,
    )
  }

  async getEmbedding(_model: string, _text: string): Promise<number[]> {
    throw new Error(
      `Provider ${this.provider.id} does not support embeddings. Please use a different provider.`,
    )
  }
}
