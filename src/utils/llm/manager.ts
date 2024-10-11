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
import { GroqProvider } from './groq'
import { OpenAIProvider } from './openai'

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
  private openaiProvider: OpenAIProvider = new OpenAIProvider()
  private groqProvider: GroqProvider = new GroqProvider()
  private anthropicProvider: AnthropicProvider = new AnthropicProvider()

  constructor(apiKeys: { openai?: string; groq?: string; anthropic?: string }) {
    this.initializeProviders(apiKeys)
  }

  private initializeProviders(apiKeys: {
    openai?: string
    groq?: string
    anthropic?: string
  }) {
    if (apiKeys.openai) {
      this.openaiProvider.initialize({ apiKey: apiKeys.openai })
    }
    if (apiKeys.groq) {
      this.groqProvider.initialize({ apiKey: apiKeys.groq })
    }
    if (apiKeys.anthropic) {
      this.anthropicProvider.initialize({ apiKey: apiKeys.anthropic })
    }
  }

  async generateResponse(
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (this.openaiProvider.getSupportedModels().includes(request.model)) {
      return this.openaiProvider.generateResponse(request, options)
    }
    if (this.groqProvider.getSupportedModels().includes(request.model)) {
      return this.groqProvider.generateResponse(request, options)
    }
    if (this.anthropicProvider.getSupportedModels().includes(request.model)) {
      return this.anthropicProvider.generateResponse(request, options)
    }
    throw new Error(`Unsupported model: ${request.model}`)
  }

  async streamResponse(
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    if (this.openaiProvider.getSupportedModels().includes(request.model)) {
      return this.openaiProvider.streamResponse(request, options)
    }
    if (this.groqProvider.getSupportedModels().includes(request.model)) {
      return this.groqProvider.streamResponse(request, options)
    }
    if (this.anthropicProvider.getSupportedModels().includes(request.model)) {
      return this.anthropicProvider.streamResponse(request, options)
    }
    throw new Error(`Unsupported model: ${request.model}`)
  }
}

export default LLMManager
