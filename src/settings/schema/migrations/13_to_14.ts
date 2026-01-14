import { SettingMigration } from '../setting.types'

import { getMigratedChatModels, getMigratedProviders } from './migrationUtils'

/**
 * Migration from version 13 to version 14
 * - Add xai provider
 * - Convert groq and morph providers to openai-compatible
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
 *   - morph-v0
 *   - sonar, sonar-pro, sonar-deep-research, sonar-reasoning, sonar-reasoning-pro
 */

const LEGACY_PROVIDERS: Record<string, string> = {
  groq: 'https://api.groq.com/openai/v1',
  morph: 'https://api.morphllm.com/v1',
}

type ProviderRecord = Record<string, unknown> & { type: string; id: string }
type ChatModelRecord = Record<string, unknown> & {
  providerType: string
  providerId: string
}

function migrateLegacyProviders(data: Record<string, unknown>) {
  const providers = (data.providers ?? []) as ProviderRecord[]
  const chatModels = (data.chatModels ?? []) as ChatModelRecord[]

  // Get provider IDs that have models using them
  const usedProviderIds = new Set(
    chatModels
      .filter((m) => m.providerType in LEGACY_PROVIDERS)
      .map((m) => m.providerId),
  )

  // Convert used legacy providers, drop unused ones
  data.providers = providers.flatMap((p) => {
    if (!(p.type in LEGACY_PROVIDERS)) return [p]
    if (!usedProviderIds.has(p.id)) return []
    return [
      {
        ...p,
        type: 'openai-compatible',
        baseUrl: p.baseUrl || LEGACY_PROVIDERS[p.type],
      },
    ]
  })

  // Convert legacy chat models
  data.chatModels = chatModels.map((m) =>
    m.providerType in LEGACY_PROVIDERS
      ? { ...m, providerType: 'openai-compatible' }
      : m,
  )
}

export const migrateFrom13To14: SettingMigration['migrate'] = (data) => {
  const newData = { ...data }
  newData.version = 14

  migrateLegacyProviders(newData)

  newData.providers = getMigratedProviders(newData, DEFAULT_PROVIDERS_V14)
  newData.chatModels = getMigratedChatModels(newData, DEFAULT_CHAT_MODELS_V14)

  return newData
}

const DEFAULT_PROVIDERS_V14 = [
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
