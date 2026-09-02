import { SettingMigration } from '../setting.types'

export const DEFAULT_CHAT_MODELS_V17 = [
  {
    providerType: 'anthropic-plan',
    providerId: 'anthropic-plan',
    id: 'claude-opus-5 (plan)',
    model: 'claude-opus-5',
  },
  {
    providerType: 'openai-plan',
    providerId: 'openai-plan',
    id: 'gpt-5.6-sol (plan)',
    model: 'gpt-5.6-sol',
  },
  {
    providerType: 'openai-plan',
    providerId: 'openai-plan',
    id: 'gpt-5.6-luna (plan)',
    model: 'gpt-5.6-luna',
  },
  {
    providerType: 'gemini-plan',
    providerId: 'gemini-plan',
    id: 'gemini-3.1-pro-preview (plan)',
    model: 'gemini-3.1-pro-preview',
  },
  {
    providerType: 'anthropic',
    providerId: 'anthropic',
    id: 'claude-opus-5',
    model: 'claude-opus-5',
  },
  {
    providerType: 'openai',
    providerId: 'openai',
    id: 'gpt-5.6-sol',
    model: 'gpt-5.6-sol',
  },
  {
    providerType: 'gemini',
    providerId: 'gemini',
    id: 'gemini-3.1-pro-preview',
    model: 'gemini-3.1-pro-preview',
  },
  {
    providerType: 'deepseek',
    providerId: 'deepseek',
    id: 'deepseek-v4-pro',
    model: 'deepseek-v4-pro',
  },
  {
    providerType: 'xai',
    providerId: 'xai',
    id: 'grok-4.6',
    model: 'grok-4.6',
  },
] as const

const DEFAULT_CHAT_MODEL_REPLACEMENTS: Record<string, string> = {
  'claude-opus-4.5 (plan)': 'claude-opus-5 (plan)',
  'claude-sonnet-4.5 (plan)': 'claude-opus-5 (plan)',
  'gpt-5.2 (plan)': 'gpt-5.6-sol (plan)',
  'gemini-3-pro-preview (plan)': 'gemini-3.1-pro-preview (plan)',
  'gemini-3-flash-preview (plan)': 'gemini-3.1-pro-preview (plan)',
  'claude-opus-4.5': 'claude-opus-5',
  'claude-sonnet-4.5': 'claude-opus-5',
  'claude-haiku-4.5': 'claude-opus-5',
  'gpt-5.2': 'gpt-5.6-sol',
  'gpt-5-mini': 'gpt-5.6-sol',
  'gpt-4.1-mini': 'gpt-5.6-sol',
  'o4-mini': 'gpt-5.6-sol',
  'gemini-3-pro-preview': 'gemini-3.1-pro-preview',
  'gemini-3-flash-preview': 'gemini-3.1-pro-preview',
  'deepseek-chat': 'deepseek-v4-pro',
  'deepseek-reasoner': 'deepseek-v4-pro',
  'grok-4-1-fast': 'grok-4.6',
  'grok-4-1-fast-non-reasoning': 'grok-4.6',
}

const OLD_DEFAULT_MODEL_IDS = new Set(
  Object.keys(DEFAULT_CHAT_MODEL_REPLACEMENTS),
)
const NEW_DEFAULT_MODEL_IDS = new Set<string>(
  DEFAULT_CHAT_MODELS_V17.map((model) => model.id),
)

export const migrateFrom16To17: SettingMigration['migrate'] = (data) => {
  const newData: Record<string, unknown> = { ...data, version: 17 }

  const customModels = Array.isArray(data.chatModels)
    ? data.chatModels.filter((model) => {
        const id = (model as { id?: unknown } | null)?.id
        return (
          typeof id !== 'string' ||
          (!OLD_DEFAULT_MODEL_IDS.has(id) && !NEW_DEFAULT_MODEL_IDS.has(id))
        )
      })
    : []
  newData.chatModels = [...DEFAULT_CHAT_MODELS_V17, ...customModels]

  if (typeof data.chatModelId === 'string') {
    newData.chatModelId =
      DEFAULT_CHAT_MODEL_REPLACEMENTS[data.chatModelId] ?? data.chatModelId
  }
  if (
    typeof data.applyModelId === 'string' &&
    OLD_DEFAULT_MODEL_IDS.has(data.applyModelId)
  ) {
    newData.applyModelId = 'gpt-5.6-luna (plan)'
  }

  return newData
}
