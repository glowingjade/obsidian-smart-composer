import OpenAI from 'openai'
import { FinalRequestOptions } from 'openai/core'
import {
  LLMOptions,
  LLMRequestNonStreaming,
  LLMRequestStreaming,
} from 'src/types/llm/request'
import {
  LLMResponseNonStreaming,
  LLMResponseStreaming,
} from 'src/types/llm/response'

import { BaseLLMProvider } from './base'
import { LLMBaseUrlNotSetException } from './exception'
import { OpenAICompatibleProvider } from './openaiCompatibleProvider'

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
        delete headers[k]
      }
    })
    return req
  }
}

export type OllamaModel = 'llama3.1:8b'
export const OLLAMA_MODELS: OllamaModel[] = ['llama3.1:8b']

export class OllamaOpenAIProvider implements BaseLLMProvider {
  private provider: OpenAICompatibleProvider
  private ollamaBaseUrl: string

  constructor(baseUrl: string) {
    this.ollamaBaseUrl = baseUrl
    this.provider = new OpenAICompatibleProvider(
      new NoStainlessOpenAI({
        apiKey: '',
        dangerouslyAllowBrowser: true,
        baseURL: `${baseUrl}/v1`,
      }),
    )
  }
  generateResponse(
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (!this.ollamaBaseUrl) {
      throw new LLMBaseUrlNotSetException(
        'Ollama Address is missing. Please set it in settings menu.',
      )
    }
    return this.provider.generateResponse(request, options)
  }
  streamResponse(
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    if (!this.ollamaBaseUrl) {
      throw new LLMBaseUrlNotSetException(
        'Ollama Address is missing. Please set it in settings menu.',
      )
    }
    return this.provider.streamResponse(request, options)
  }
  getSupportedModels(): string[] {
    return OLLAMA_MODELS
  }
}
