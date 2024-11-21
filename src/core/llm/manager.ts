import { LLMModel } from '../../types/llm/model'
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
import { OllamaProvider } from './ollama'
import { OpenAIAuthenticatedProvider } from './openai'
import { OpenAICompatibleProvider } from './openaiCompatibleProvider'

export type LLMManagerInterface = {
  generateResponse(
    model: LLMModel,
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming>
  streamResponse(
    model: LLMModel,
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>>
}

class LLMManager implements LLMManagerInterface {
  private openaiProvider: OpenAIAuthenticatedProvider
  private anthropicProvider: AnthropicProvider
  private geminiProvider: GeminiProvider
  private groqProvider: GroqProvider
  private ollamaProvider: OllamaProvider
  private openaiCompatibleProvider: OpenAICompatibleProvider

  constructor(apiKeys: {
    openai?: string
    anthropic?: string
    gemini?: string
    groq?: string
  }) {
    this.openaiProvider = new OpenAIAuthenticatedProvider(apiKeys.openai ?? '')
    this.anthropicProvider = new AnthropicProvider(apiKeys.anthropic ?? '')
    this.geminiProvider = new GeminiProvider(apiKeys.gemini ?? '')
    this.groqProvider = new GroqProvider(apiKeys.groq ?? '')
    this.ollamaProvider = new OllamaProvider()
    this.openaiCompatibleProvider = new OpenAICompatibleProvider()
  }

  async generateResponse(
    model: LLMModel,
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    switch (model.provider) {
      case 'openai':
        return await this.openaiProvider.generateResponse(
          model,
          request,
          options,
        )
      case 'anthropic':
        return await this.anthropicProvider.generateResponse(
          model,
          request,
          options,
        )
      case 'gemini':
        return await this.geminiProvider.generateResponse(
          model,
          request,
          options,
        )
      case 'groq':
        return await this.groqProvider.generateResponse(model, request, options)
      case 'ollama':
        return await this.ollamaProvider.generateResponse(
          model,
          request,
          options,
        )
      case 'openai-compatible':
        return await this.openaiCompatibleProvider.generateResponse(
          model,
          request,
          options,
        )
    }
  }

  async streamResponse(
    model: LLMModel,
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    /*
     * OpenAI, OpenAI-compatible, and Anthropic providers include token usage statistics
     * in the final chunk of the stream (following OpenAI's behavior).
     * Groq and Ollama currently do not support usage statistics for streaming responses.
     */
    switch (model.provider) {
      case 'openai':
        return await this.openaiProvider.streamResponse(model, request, options)
      case 'anthropic':
        return await this.anthropicProvider.streamResponse(
          model,
          request,
          options,
        )
      case 'gemini':
        return await this.geminiProvider.streamResponse(model, request, options)
      case 'groq':
        return await this.groqProvider.streamResponse(model, request, options)
      case 'ollama':
        return await this.ollamaProvider.streamResponse(model, request, options)
      case 'openai-compatible':
        return await this.openaiCompatibleProvider.streamResponse(
          model,
          request,
          options,
        )
    }
  }
}

export default LLMManager
