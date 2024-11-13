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
import {
  NoStainlessOpenAI,
  OpenAICompatibleProvider,
} from './openaiCompatibleProvider'

export type OllamaModel = 'llama3.1:8b'
export const OLLAMA_MODELS: OllamaModel[] = ['llama3.1:8b']

export class OllamaOpenAIProvider implements BaseLLMProvider {
  private provider: OpenAICompatibleProvider
  private ollamaBaseUrl: string

  private static readonly ERRORS = {
    BASE_URL_MISSING:
      'Ollama Address is missing. Please set it in settings menu.',
  } as const

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
        OllamaOpenAIProvider.ERRORS.BASE_URL_MISSING,
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
        OllamaOpenAIProvider.ERRORS.BASE_URL_MISSING,
      )
    }
    return this.provider.streamResponse(request, options)
  }
  getSupportedModels(): string[] {
    return OLLAMA_MODELS
  }
}
