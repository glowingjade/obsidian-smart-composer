import { SettingMigration } from '../setting.types'

import { DEFAULT_CHAT_MODELS_V14 } from './13_to_14'
import { getMigratedChatModels, getMigratedProviders } from './migrationUtils'

const DEFAULT_PROVIDERS_V15 = [
  { type: 'openai-codex', id: 'openai-codex' },
  { type: 'anthropic-claude-code', id: 'anthropic-claude-code' },
  { type: 'openai', id: 'openai' },
  { type: 'anthropic', id: 'anthropic' },
  { type: 'gemini', id: 'gemini' },
  { type: 'xai', id: 'xai' },
  { type: 'deepseek', id: 'deepseek' },
  { type: 'mistral', id: 'mistral' },
  { type: 'perplexity', id: 'perplexity' },
  { type: 'openrouter', id: 'openrouter' },
  { type: 'ollama', id: 'ollama' },
  { type: 'lm-studio', id: 'lm-studio' },
] as const

const DEFAULT_CHAT_MODELS_V15 = [
  {
    providerType: 'openai-codex',
    providerId: 'openai-codex',
    id: 'codex-gpt-5.2',
    model: 'gpt-5.2',
  },
  {
    providerType: 'anthropic-claude-code',
    providerId: 'anthropic-claude-code',
    id: 'claude-code-opus-4.5',
    model: 'claude-opus-4-5',
    thinking: {
      enabled: true,
      budget_tokens: 8192,
    },
  },
  {
    providerType: 'anthropic-claude-code',
    providerId: 'anthropic-claude-code',
    id: 'claude-code-sonnet-4.5',
    model: 'claude-sonnet-4-5',
    thinking: {
      enabled: true,
      budget_tokens: 8192,
    },
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
