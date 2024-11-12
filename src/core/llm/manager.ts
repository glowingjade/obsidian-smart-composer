import {
  LLMOptions,
  LLMRequestNonStreaming,
  LLMRequestStreaming,
} from '../../types/llm/request'
import {
  LLMResponseNonStreaming,
  LLMResponseStreaming,
} from '../../types/llm/response'

import { AnthropicProvider } from './anthropic'
import { GeminiProvider } from './gemini'
import { GroqProvider } from './groq'
import { OllamaOpenAIProvider } from './ollama'
import { OpenAIAuthenticatedProvider } from './openai'

export type LLMManagerInterface = {
  generateResponse(
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming>
  streamResponse(
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>>
}

class LLMManager implements LLMManagerInterface {
  private openaiProvider: OpenAIAuthenticatedProvider
  private anthropicProvider: AnthropicProvider
  private geminiProvider: GeminiProvider
  private groqProvider: GroqProvider
  private ollamaProvider: OllamaOpenAIProvider

  constructor(
    apiKeys: {
      openai?: string
      groq?: string
      anthropic?: string
      gemini?: string
    },
    ollamaBaseUrl?: string,
  ) {
    this.openaiProvider = new OpenAIAuthenticatedProvider(apiKeys.openai ?? '')
    this.anthropicProvider = new AnthropicProvider(apiKeys.anthropic ?? '')
    this.geminiProvider = new GeminiProvider(apiKeys.gemini ?? '')
    this.groqProvider = new GroqProvider(apiKeys.groq ?? '')
    this.ollamaProvider = new OllamaOpenAIProvider(ollamaBaseUrl ?? '')
  }

  async generateResponse(
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (this.openaiProvider.getSupportedModels().includes(request.model)) {
      return await this.openaiProvider.generateResponse(request, options)
    }
    if (this.anthropicProvider.getSupportedModels().includes(request.model)) {
      return await this.anthropicProvider.generateResponse(request, options)
    }
    if (this.geminiProvider.getSupportedModels().includes(request.model)) {
      return await this.geminiProvider.generateResponse(request, options)
    }
    if (this.groqProvider.getSupportedModels().includes(request.model)) {
      return await this.groqProvider.generateResponse(request, options)
    }
    if (this.ollamaProvider.getSupportedModels().includes(request.model)) {
      return await this.ollamaProvider.generateResponse(request, options)
    }
    throw new Error(`Unsupported model: ${request.model}`)
  }

  async streamResponse(
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    if (this.openaiProvider.getSupportedModels().includes(request.model)) {
      return await this.openaiProvider.streamResponse(request, options)
    }
    if (this.anthropicProvider.getSupportedModels().includes(request.model)) {
      return await this.anthropicProvider.streamResponse(request, options)
    }
    if (this.geminiProvider.getSupportedModels().includes(request.model)) {
      return await this.geminiProvider.streamResponse(request, options)
    }
    if (this.groqProvider.getSupportedModels().includes(request.model)) {
      return await this.groqProvider.streamResponse(request, options)
    }
    if (this.ollamaProvider.getSupportedModels().includes(request.model)) {
      return await this.ollamaProvider.streamResponse(request, options)
    }
    throw new Error(`Unsupported model: ${request.model}`)
  }
}

export default LLMManager
