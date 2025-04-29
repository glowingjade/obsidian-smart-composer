import { SettingMigration } from '../setting.types'

import { DefaultProviders, getMigratedProviders } from './migrationUtils'

/**
 * Migration from version 9 to version 10
 * - Add mistral provider
 */
export const DEFAULT_PROVIDERS_V10: DefaultProviders = [
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
    type: 'mistral',
    id: 'mistral',
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

export const migrateFrom9To10: SettingMigration['migrate'] = (data) => {
  const newData = { ...data }
  newData.version = 10
  newData.providers = getMigratedProviders(newData, DEFAULT_PROVIDERS_V10)
  return newData
}
