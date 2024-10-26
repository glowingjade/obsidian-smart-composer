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
import { LLMABaseUrlNotSetException } from './exception'
import { OpenAIProvider } from './openai'

export class NoStainlessOpenAI extends OpenAI {
  defaultHeaders(opts: FinalRequestOptions) {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...this.authHeaders(opts),
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
export const OLLAMA_MODELS: OllamaModel[] = [
  'llama3.1:8b',
]

export class OllamaAIOpenAIProvider implements BaseLLMProvider {
  private wrappedOpenAIProvider: OpenAIProvider
  private ollamaBaseUrl: string

  constructor(apiKey: string, ollamaBaseUrl: string) {
    this.ollamaBaseUrl = ollamaBaseUrl
    const overrideApiKeyForOllama =
      apiKey.trim().length === 0 ? 'empty' : apiKey
    this.wrappedOpenAIProvider = new OpenAIProvider(
      '',
      new NoStainlessOpenAI({
        apiKey: overrideApiKeyForOllama,
        dangerouslyAllowBrowser: true,
        baseURL: `${ollamaBaseUrl}/v1`,
      }),
    )
  }
  generateResponse(
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (!this.ollamaBaseUrl) {
      throw new LLMABaseUrlNotSetException(
        'Ollama Address is missing. Please set it in settings menu.',
      )
    }
    return this.wrappedOpenAIProvider.generateResponse(request, options)
  }
  streamResponse(
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    if (!this.ollamaBaseUrl) {
      throw new LLMABaseUrlNotSetException(
        'Ollama Address is missing. Please set it in settings menu.',
      )
    }
    return this.wrappedOpenAIProvider.streamResponse(request, options)
  }
  getSupportedModels(): string[] {
    return OLLAMA_MODELS
  }
}
