import { SettingMigration } from '../setting.types'

import { DEFAULT_CHAT_MODELS_V14 } from './13_to_14'
import { getMigratedChatModels, getMigratedProviders } from './migrationUtils'

const DEFAULT_PROVIDERS_V15 = [
  { type: 'anthropic-plan', id: 'anthropic-plan' },
  { type: 'openai-plan', id: 'openai-plan' },
  { type: 'anthropic', id: 'anthropic' },
  { type: 'openai', id: 'openai' },
  { type: 'gemini', id: 'gemini' },
  { type: 'xai', id: 'xai' },
  { type: 'deepseek', id: 'deepseek' },
  { type: 'mistral', id: 'mistral' },
  { type: 'perplexity', id: 'perplexity' },
  { type: 'openrouter', id: 'openrouter' },
  { type: 'ollama', id: 'ollama' },
  { type: 'lm-studio', id: 'lm-studio' },
] as const

export const DEFAULT_CHAT_MODELS_V15 = [
  {
    providerType: 'anthropic-plan',
    providerId: 'anthropic-plan',
    id: 'claude-opus-4.5 (plan)',
    model: 'claude-opus-4-5',
    thinking: {
      enabled: true,
      budget_tokens: 8192,
    },
  },
  {
    providerType: 'anthropic-plan',
    providerId: 'anthropic-plan',
    id: 'claude-sonnet-4.5 (plan)',
    model: 'claude-sonnet-4-5',
    thinking: {
      enabled: true,
      budget_tokens: 8192,
    },
  },
  {
    providerType: 'openai-plan',
    providerId: 'openai-plan',
    id: 'gpt-5.2 (plan)',
    model: 'gpt-5.2',
  },
  ...DEFAULT_CHAT_MODELS_V14,
]

export const migrateFrom14To15: SettingMigration['migrate'] = (data) => {
  const newData = { ...data }
  newData.version = 15

  newData.providers = getMigratedProviders(newData, DEFAULT_PROVIDERS_V15)
  newData.chatModels = getMigratedChatModels(newData, DEFAULT_CHAT_MODELS_V15)

  return newData
}
