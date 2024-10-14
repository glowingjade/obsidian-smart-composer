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
  private openaiProvider: OpenAIProvider
  private groqProvider: GroqProvider
  private anthropicProvider: AnthropicProvider

  constructor(apiKeys: { openai?: string; groq?: string; anthropic?: string }) {
    this.openaiProvider = new OpenAIProvider(apiKeys.openai ?? '')
    this.groqProvider = new GroqProvider(apiKeys.groq ?? '')
    this.anthropicProvider = new AnthropicProvider(apiKeys.anthropic ?? '')
  }

  async generateResponse(
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (this.openaiProvider.getSupportedModels().includes(request.model)) {
      return await this.openaiProvider.generateResponse(request, options)
    }
    if (this.groqProvider.getSupportedModels().includes(request.model)) {
      return await this.groqProvider.generateResponse(request, options)
    }
    if (this.anthropicProvider.getSupportedModels().includes(request.model)) {
      return await this.anthropicProvider.generateResponse(request, options)
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
    if (this.groqProvider.getSupportedModels().includes(request.model)) {
      return await this.groqProvider.streamResponse(request, options)
    }
    if (this.anthropicProvider.getSupportedModels().includes(request.model)) {
      return await this.anthropicProvider.streamResponse(request, options)
    }
    throw new Error(`Unsupported model: ${request.model}`)
  }
}

export default LLMManager
