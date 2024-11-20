/**
 * This provider is nearly identical to OpenAICompatibleProvider, but uses a custom OpenAI client
 * (NoStainlessOpenAI) to work around CORS issues specific to Ollama.
 */

import OpenAI from 'openai'
import { FinalRequestOptions } from 'openai/core'

import { OllamaModel } from '../../types/llm/model'
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
import { LLMBaseUrlNotSetException, LLMModelNotSetException } from './exception'
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

export class OllamaProvider implements BaseLLMProvider {
  private adapter: OpenAIMessageAdapter

  constructor() {
    this.adapter = new OpenAIMessageAdapter()
  }

  async generateResponse(
    model: OllamaModel,
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (!model.baseURL) {
      throw new LLMBaseUrlNotSetException(
        'Ollama base URL is missing. Please set it in settings menu.',
      )
    }

    if (!model.model) {
      throw new LLMModelNotSetException(
        'Ollama model is missing. Please set it in settings menu.',
      )
    }

    const client = new NoStainlessOpenAI({
      baseURL: `${model.baseURL}/v1`,
      apiKey: '',
      dangerouslyAllowBrowser: true,
    })
    return this.adapter.generateResponse(client, request, options)
  }

  async streamResponse(
    model: OllamaModel,
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    if (!model.baseURL) {
      throw new LLMBaseUrlNotSetException(
        'Ollama base URL is missing. Please set it in settings menu.',
      )
    }

    if (!model.model) {
      throw new LLMModelNotSetException(
        'Ollama model is missing. Please set it in settings menu.',
      )
    }

    const client = new NoStainlessOpenAI({
      baseURL: `${model.baseURL}/v1`,
      apiKey: '',
      dangerouslyAllowBrowser: true,
    })
    return this.adapter.streamResponse(client, request, options)
  }
}
