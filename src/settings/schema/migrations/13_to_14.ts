import { SettingMigration } from '../setting.types'

import { getMigratedChatModels, getMigratedProviders } from './migrationUtils'

/**
 * Migration from version 13 to version 14
 * - Add xai provider
 * - Add following models:
 *   - gpt-5.2
 *   - gpt-4.1-mini
 *   - claude-opus-4.5
 *   - gemini-3-pro-preview
 *   - gemini-3-flash-preview
 *   - grok-4-1-fast
 *   - grok-4-1-fast-non-reasoning
 * - Remove following models from defaults:
 *   - gpt-5.1
 *   - gpt-5-nano
 *   - gpt-4o
 *   - gpt-4o-mini
 *   - o3
 *   - claude-opus-4.1
 *   - gemini-2.5-pro
 *   - gemini-2.5-flash
 *   - gemini-2.5-flash-lite
 *   - gemini-2.0-flash
 *   - gemini-2.0-flash-lite
 */
export const migrateFrom13To14: SettingMigration['migrate'] = (data) => {
  const newData = { ...data }
  newData.version = 14

  newData.providers = getMigratedProviders(newData, DEFAULT_PROVIDERS_V14)
  newData.chatModels = getMigratedChatModels(newData, DEFAULT_CHAT_MODELS_V14)

  return newData
}

const DEFAULT_PROVIDERS_V14 = [
  { type: 'openai', id: 'openai' },
  { type: 'anthropic', id: 'anthropic' },
  { type: 'gemini', id: 'gemini' },
  { type: 'deepseek', id: 'deepseek' },
  { type: 'perplexity', id: 'perplexity' },
  { type: 'groq', id: 'groq' },
  { type: 'mistral', id: 'mistral' },
  { type: 'openrouter', id: 'openrouter' },
  { type: 'ollama', id: 'ollama' },
  { type: 'lm-studio', id: 'lm-studio' },
  { type: 'morph', id: 'morph' },
  { type: 'xai', id: 'xai' },
] as const

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
    id: 'claude-opus-4.5',
    model: 'claude-opus-4-5',
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
    id: 'gemini-3-pro-preview',
    model: 'gemini-3-pro-preview',
  },
  {
    providerType: 'gemini',
    providerId: 'gemini',
    id: 'gemini-3-flash-preview',
    model: 'gemini-3-flash-preview',
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
  {
    providerType: 'xai',
    providerId: 'xai',
    id: 'grok-4-1-fast',
    model: 'grok-4-1-fast',
  },
  {
    providerType: 'xai',
    providerId: 'xai',
    id: 'grok-4-1-fast-non-reasoning',
    model: 'grok-4-1-fast-non-reasoning',
  },
]
