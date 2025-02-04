/**
 * This provider is nearly identical to OpenAICompatibleProvider, but uses a custom OpenAI client
 * (NoStainlessOpenAI) to work around CORS issues specific to Ollama.
 */

import OpenAI from 'openai'
import { FinalRequestOptions } from 'openai/core'

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
import { LLMModelNotSetException } from './exception'
import { OpenAIMessageAdapter } from './openaiMessageAdapter'

export class NoStainlessOpenAI extends OpenAI {
  defaultHeaders() {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }
  }

  buildRequest<Req>(
    options: FinalRequestOptions<Req>,
    { retryCount = 0 }: { retryCount?: number } = {},
  ): { req: RequestInit; url: string; timeout: number } {
    const req = super.buildRequest(options, { retryCount })
    const headers = req.req.headers as Record<string, string>
    Object.keys(headers).forEach((k) => {
      if (k.startsWith('x-stainless')) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete headers[k]
      }
    })
    return req
  }
}

export class OllamaProvider extends BaseLLMProvider<
  Extract<LLMProvider, { type: 'ollama' }>
> {
  private adapter: OpenAIMessageAdapter
  private client: NoStainlessOpenAI

  constructor(provider: Extract<LLMProvider, { type: 'ollama' }>) {
    super(provider)
    this.adapter = new OpenAIMessageAdapter()
    this.client = new NoStainlessOpenAI({
      baseURL: `${provider.baseUrl ? provider.baseUrl.replace(/\/+$/, '') : 'http://127.0.0.1:11434'}/v1`,
      apiKey: provider.apiKey ?? '',
      dangerouslyAllowBrowser: true,
    })
  }

  async generateResponse(
    model: ChatModel,
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (model.providerType !== 'ollama') {
      throw new Error('Model is not an Ollama model')
    }

    if (!model.model) {
      throw new LLMModelNotSetException(
        `Provider ${this.provider.id} model is missing. Please set it in settings menu.`,
      )
    }

    return this.adapter.generateResponse(this.client, request, options)
  }

  async streamResponse(
    model: ChatModel,
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    if (model.providerType !== 'ollama') {
      throw new Error('Model is not an Ollama model')
    }

    if (!model.model) {
      throw new LLMModelNotSetException(
        `Provider ${this.provider.id} model is missing. Please set it in settings menu.`,
      )
    }

    return this.adapter.streamResponse(this.client, request, options)
  }

  async getEmbedding(model: string, text: string): Promise<number[]> {
    const embedding = await this.client.embeddings.create({
      model: model,
      input: text,
    })
    return embedding.data[0].embedding
  }
}
