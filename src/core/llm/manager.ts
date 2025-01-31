import { SmartCopilotSettings } from '../../settings/schema/setting.types'
import { ChatModel } from '../../types/chat-model.types'

import { AnthropicProvider } from './anthropic'
import { BaseLLMProvider } from './base'
import { GeminiProvider } from './gemini'
import { GroqProvider } from './groq'
import { OllamaProvider } from './ollama'
import { OpenAIAuthenticatedProvider } from './openai'
import { OpenAICompatibleProvider } from './openaiCompatibleProvider'

/*
 * OpenAI, OpenAI-compatible, and Anthropic providers include token usage statistics
 * in the final chunk of the stream (following OpenAI's behavior).
 * Groq and Ollama currently do not support usage statistics for streaming responses.
 */

export function getChatModelClient({
  settings,
  modelId,
}: {
  settings: SmartCopilotSettings
  modelId: string
}): {
  providerClient: BaseLLMProvider
  model: ChatModel
} {
  const chatModel = settings.chatModels.find((model) => model.id === modelId)
  if (!chatModel) {
    throw new Error(`Chat model ${modelId} not found`)
  }

  const chatProvider = settings.providers.find(
    (provider) => provider.id === chatModel.providerId,
  )
  if (!chatProvider) {
    throw new Error(`Model provider ${chatModel.providerId} not found`)
  }

  if (chatModel.providerType !== chatProvider.type) {
    throw new Error('Chat model and provider type do not match')
  }

  switch (chatProvider.type) {
    case 'openai': {
      return {
        providerClient: new OpenAIAuthenticatedProvider(chatProvider),
        model: chatModel,
      }
    }
    case 'anthropic': {
      return {
        providerClient: new AnthropicProvider(chatProvider),
        model: chatModel,
      }
    }
    case 'gemini': {
      return {
        providerClient: new GeminiProvider(chatProvider),
        model: chatModel,
      }
    }
    case 'groq': {
      return {
        providerClient: new GroqProvider(chatProvider),
        model: chatModel,
      }
    }
    case 'ollama': {
      return {
        providerClient: new OllamaProvider(chatProvider),
        model: chatModel,
      }
    }
    case 'openai-compatible': {
      return {
        providerClient: new OpenAICompatibleProvider(chatProvider),
        model: chatModel,
      }
    }
  }
}
