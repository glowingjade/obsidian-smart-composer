import { SettingMigration } from '../setting.types'
import { getMigratedProviders } from './migrationUtils';

/**
 * Migration from version 6 to version 7
 * - Add perplexity provider
 * - Add perplexity models
 * - Add gemini models
 * - Change default providers order
 * - Sort default models by provider type
 */

export const DEFAULT_PROVIDERS_V7: readonly {
  type: string
  id: string
}[] = [
  {
    type: 'openai',
    id: 'openai',
  },
  {
    type: 'anthropic',
    id: 'anthropic',
  },
  {
    type: 'gemini',
    id: 'gemini',
  },
  {
    type: 'deepseek',
    id: 'deepseek',
  },
  {
    type: 'perplexity',
    id: 'perplexity',
  },
  {
    type: 'groq',
    id: 'groq',
  },
  {
    type: 'openrouter',
    id: 'openrouter',
  },
  {
    type: 'ollama',
    id: 'ollama',
  },
  {
    type: 'lm-studio',
    id: 'lm-studio',
  },
  {
    type: 'morph',
    id: 'morph',
  },
]

export const DEFAULT_CHAT_MODELS_V7: {
  id: string
  providerType: string
  providerId: string
  model: string
  reasoning_effort?: string
  thinking?: {
    budget_tokens: number
  }
  web_search_options?: {
    search_context_size?: string
  }
  enable?: boolean
}[] = [
  {
    providerType: 'anthropic',
    providerId: 'anthropic',
    id: 'claude-3.7-sonnet',
    model: 'claude-3-7-sonnet-latest',
  },
  {
    providerType: 'anthropic',
    providerId: 'anthropic',
    id: 'claude-3.7-sonnet-thinking',
    model: 'claude-3-7-sonnet-latest',
    thinking: {
      budget_tokens: 8192,
    },
  },
  {
    providerType: 'anthropic',
    providerId: 'anthropic',
    id: 'claude-3.5-sonnet',
    model: 'claude-3-5-sonnet-latest',
  },
  {
    providerType: 'anthropic',
    providerId: 'anthropic',
    id: 'claude-3.5-haiku',
    model: 'claude-3-5-haiku-latest',
  },
  {
    providerType: 'openai',
    providerId: 'openai',
    id: 'gpt-4o',
    model: 'gpt-4o',
  },
  {
    providerType: 'openai',
    providerId: 'openai',
    id: 'gpt-4o-mini',
    model: 'gpt-4o-mini',
  },
  {
    providerType: 'openai',
    providerId: 'openai',
    id: 'o3-mini',
    model: 'o3-mini',
    reasoning_effort: 'medium',
  },
  {
    providerType: 'openai',
    providerId: 'openai',
    id: 'o1',
    model: 'o1',
    reasoning_effort: 'medium',
  },
  {
    providerType: 'gemini',
    providerId: 'gemini',
    id: 'gemini-2.5-pro',
    model: 'gemini-2.5-pro-preview-03-25',
  },
  {
    providerType: 'gemini',
    providerId: 'gemini',
    id: 'gemini-2.0-flash',
    model: 'gemini-2.0-flash',
  },
  {
    providerType: 'gemini',
    providerId: 'gemini',
    id: 'gemini-2.0-flash-thinking',
    model: 'gemini-2.0-flash-thinking-exp',
  },
  {
    providerType: 'gemini',
    providerId: 'gemini',
    id: 'gemini-2.0-flash-lite',
    model: 'gemini-2.0-flash-lite',
  },
  {
    providerType: 'gemini',
    providerId: 'gemini',
    id: 'gemini-1.5-pro',
    model: 'gemini-1.5-pro',
  },
  {
    providerType: 'gemini',
    providerId: 'gemini',
    id: 'gemini-1.5-flash',
    model: 'gemini-1.5-flash',
  },
  {
    providerType: 'deepseek',
    providerId: 'deepseek',
    id: 'deepseek-chat',
    model: 'deepseek-chat',
  },
  {
    providerType: 'deepseek',
    providerId: 'deepseek',
    id: 'deepseek-reasoner',
    model: 'deepseek-reasoner',
  },
  {
    providerType: 'perplexity',
    providerId: 'perplexity',
    id: 'sonar',
    model: 'sonar',
    web_search_options: {
      search_context_size: 'low',
    },
  },
  {
    providerType: 'perplexity',
    providerId: 'perplexity',
    id: 'sonar-pro',
    model: 'sonar',
    web_search_options: {
      search_context_size: 'low',
    },
  },
  {
    providerType: 'perplexity',
    providerId: 'perplexity',
    id: 'sonar-deep-research',
    model: 'sonar-deep-research',
    web_search_options: {
      search_context_size: 'low',
    },
  },
  {
    providerType: 'perplexity',
    providerId: 'perplexity',
    id: 'sonar-reasoning',
    model: 'sonar',
    web_search_options: {
      search_context_size: 'low',
    },
  },
  {
    providerType: 'perplexity',
    providerId: 'perplexity',
    id: 'sonar-reasoning-pro',
    model: 'sonar',
    web_search_options: {
      search_context_size: 'low',
    },
  },
  {
    providerType: 'morph',
    providerId: 'morph',
    id: 'morph-v0',
    model: 'morph-v0',
  },
]

export const migrateFrom6To7: SettingMigration['migrate'] = (data) => {
  const newData = { ...data }
  newData.version = 7

  newData.providers = getMigratedProviders(newData, DEFAULT_PROVIDERS_V7);

  if (!('chatModels' in newData && Array.isArray(newData.chatModels))) {
    newData.chatModels = DEFAULT_CHAT_MODELS_V7
  } else {
    const defaultChatModels = DEFAULT_CHAT_MODELS_V7.map((model) => {
      const existingModel = (newData.chatModels as unknown[]).find(
        (m: unknown) => {
          return (m as { id: string }).id === model.id
        },
      )
      if (existingModel) {
        return Object.assign(existingModel, model)
      }
      return model
    })
    const customChatModels = (newData.chatModels as unknown[]).filter(
      (m: unknown) => {
        return !defaultChatModels.some(
          (dm: unknown) =>
            (dm as { id: string }).id === (m as { id: string }).id,
        )
      },
    )
    newData.chatModels = [...defaultChatModels, ...customChatModels]
  }

  return newData
}
