import { SettingMigration } from '../setting.types'

import { DefaultChatModels, getMigratedChatModels } from './migrationUtils'

export const DEFAULT_CHAT_MODELS_V8: DefaultChatModels = [
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
    // New
    providerType: 'openai',
    providerId: 'openai',
    id: 'gpt-4.1',
    model: 'gpt-4.1',
  },
  {
    // New
    providerType: 'openai',
    providerId: 'openai',
    id: 'gpt-4.1-mini',
    model: 'gpt-4.1-mini',
  },
  {
    // New
    providerType: 'openai',
    providerId: 'openai',
    id: 'gpt-4.1-nano',
    model: 'gpt-4.1-nano',
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
    // New
    providerType: 'openai',
    providerId: 'openai',
    id: 'o4-mini',
    model: 'o4-mini',
    reasoning_effort: 'medium',
  },
  {
    // New
    providerType: 'openai',
    providerId: 'openai',
    id: 'o3',
    model: 'o3',
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

/**
 * Migration from version 7 to version 8
 * - Add the following models:
 *   - gpt-4.1
 *   - gpt-4.1-mini
 *   - gpt-4.1-nano
 *   - o3
 *   - o4-mini
 * - Disable the following deprecated models:
 *   - o1
 *   - o3-mini
 */
export const migrateFrom7To8: SettingMigration['migrate'] = (data) => {
  const newData = { ...data }
  newData.version = 8

  newData.chatModels = getMigratedChatModels(newData, DEFAULT_CHAT_MODELS_V8)

  return newData
}
