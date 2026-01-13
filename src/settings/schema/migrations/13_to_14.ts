import { SettingMigration } from '../setting.types'

import { getMigratedChatModels } from './migrationUtils'

/**
 * Migration from version 13 to version 14
 * - Add following models:
 *   - gpt-5.2
 *   - gpt-4.1-mini
 */
export const migrateFrom13To14: SettingMigration['migrate'] = (data) => {
  const newData = { ...data }
  newData.version = 14

  newData.chatModels = getMigratedChatModels(newData, DEFAULT_CHAT_MODELS_V14)

  return newData
}

type DefaultChatModelsV14 = {
  id: string
  providerType: string
  providerId: string
  model: string
  reasoning?: {
    enabled: boolean
    reasoning_effort?: string
  }
  thinking?: {
    enabled: boolean
    budget_tokens: number
  }
  web_search_options?: {
    search_context_size?: string
  }
  enable?: boolean
}[]

export const DEFAULT_CHAT_MODELS_V14: DefaultChatModelsV14 = [
  {
    providerType: 'anthropic',
    providerId: 'anthropic',
    id: 'claude-opus-4.1',
    model: 'claude-opus-4-1',
  },
  {
    providerType: 'anthropic',
    providerId: 'anthropic',
    id: 'claude-sonnet-4.5',
    model: 'claude-sonnet-4-5',
  },
  {
    providerType: 'anthropic',
    providerId: 'anthropic',
    id: 'claude-haiku-4.5',
    model: 'claude-haiku-4-5',
  },
  {
    providerType: 'openai',
    providerId: 'openai',
    id: 'gpt-5.2',
    model: 'gpt-5.2',
  },
  {
    providerType: 'openai',
    providerId: 'openai',
    id: 'gpt-5-mini',
    model: 'gpt-5-mini',
  },
  {
    providerType: 'openai',
    providerId: 'openai',
    id: 'gpt-4.1-mini',
    model: 'gpt-4.1-mini',
  },
  {
    providerType: 'openai',
    providerId: 'openai',
    id: 'o4-mini',
    model: 'o4-mini',
    reasoning: {
      enabled: true,
      reasoning_effort: 'medium',
    },
  },
  {
    providerType: 'gemini',
    providerId: 'gemini',
    id: 'gemini-2.5-pro',
    model: 'gemini-2.5-pro',
  },
  {
    providerType: 'gemini',
    providerId: 'gemini',
    id: 'gemini-2.5-flash',
    model: 'gemini-2.5-flash',
  },
  {
    providerType: 'gemini',
    providerId: 'gemini',
    id: 'gemini-2.5-flash-lite',
    model: 'gemini-2.5-flash-lite',
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
    id: 'gemini-2.0-flash-lite',
    model: 'gemini-2.0-flash-lite',
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
