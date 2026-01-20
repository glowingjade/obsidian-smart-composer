import { SmartComposerSettings } from '../../settings/schema/setting.types'
import { ChatModel } from '../../types/chat-model.types'
import { LLMProvider } from '../../types/provider.types'

import { AnthropicProvider } from './anthropic'
import { AnthropicClaudeCodeProvider } from './anthropicClaudeCodeProvider'
import { AzureOpenAIProvider } from './azureOpenaiProvider'
import { BaseLLMProvider } from './base'
import { DeepSeekStudioProvider } from './deepseekStudioProvider'
import { LLMModelNotFoundException } from './exception'
import { GeminiProvider } from './gemini'
import { GeminiPlanProvider } from './geminiPlanProvider'
import { LmStudioProvider } from './lmStudioProvider'
import { MistralProvider } from './mistralProvider'
import { OllamaProvider } from './ollama'
import { OpenAIAuthenticatedProvider } from './openai'
import { OpenAICodexProvider } from './openaiCodexProvider'
import { OpenAICompatibleProvider } from './openaiCompatibleProvider'
import { OpenRouterProvider } from './openRouterProvider'
import { PerplexityProvider } from './perplexityProvider'
import { XaiProvider } from './xaiProvider'

/*
 * OpenAI, OpenAI-compatible, and Anthropic providers include token usage statistics
 * in the final chunk of the stream (following OpenAI's behavior).
 */

export function getProviderClient({
  providerId,
  settings,
  setSettings,
}: {
  providerId: string
  settings: SmartComposerSettings
  setSettings?: (newSettings: SmartComposerSettings) => void | Promise<void>
}): BaseLLMProvider<LLMProvider> {
  const provider = settings.providers.find((p) => p.id === providerId)
  if (!provider) {
    throw new Error(`Provider ${providerId} not found`)
  }

  const onProviderUpdate = setSettings
    ? async (targetProviderId: string, update: Partial<LLMProvider>) => {
        const updatedProviders: LLMProvider[] = settings.providers.map(
          (item) =>
            item.id === targetProviderId
              ? ({ ...item, ...update } as LLMProvider)
              : item,
        )
        await setSettings({
          ...settings,
          providers: updatedProviders,
        })
      }
    : undefined

  switch (provider.type) {
    case 'anthropic-plan': {
      return new AnthropicClaudeCodeProvider(provider, onProviderUpdate)
    }
    case 'openai-plan': {
      return new OpenAICodexProvider(provider, onProviderUpdate)
    }
    case 'gemini-plan': {
      return new GeminiPlanProvider(provider, onProviderUpdate)
    }
    case 'anthropic': {
      return new AnthropicProvider(provider)
    }
    case 'openai': {
      return new OpenAIAuthenticatedProvider(provider)
    }
    case 'gemini': {
      return new GeminiProvider(provider)
    }
    case 'openrouter': {
      return new OpenRouterProvider(provider)
    }
    case 'ollama': {
      return new OllamaProvider(provider)
    }
    case 'lm-studio': {
      return new LmStudioProvider(provider)
    }
    case 'deepseek': {
      return new DeepSeekStudioProvider(provider)
    }
    case 'perplexity': {
      return new PerplexityProvider(provider)
    }
    case 'mistral': {
      return new MistralProvider(provider)
    }
    case 'xai': {
      return new XaiProvider(provider)
    }
    case 'azure-openai': {
      return new AzureOpenAIProvider(provider)
    }
    case 'openai-compatible': {
      return new OpenAICompatibleProvider(provider)
    }
  }
}

export function getChatModelClient({
  modelId,
  settings,
  setSettings,
}: {
  modelId: string
  settings: SmartComposerSettings
  setSettings: (newSettings: SmartComposerSettings) => void | Promise<void>
}): {
  providerClient: BaseLLMProvider<LLMProvider>
  model: ChatModel
} {
  const chatModel = settings.chatModels.find((model) => model.id === modelId)
  if (!chatModel) {
    throw new LLMModelNotFoundException(`Chat model ${modelId} not found`)
  }

  const providerClient = getProviderClient({
    providerId: chatModel.providerId,
    settings,
    setSettings,
  })

  return {
    providerClient,
    model: chatModel,
  }
}
