import { z } from 'zod'

import {
  APPLY_MODEL_OPTIONS,
  CHAT_MODEL_OPTIONS,
  EMBEDDING_MODEL_OPTIONS,
} from '../constants'

export const SETTINGS_SCHEMA_VERSION = 1

const ollamaModelSchema = z.object({
  baseUrl: z.string().catch(''),
  model: z.string().catch(''),
})

const openAICompatibleModelSchema = z.object({
  baseUrl: z.string().catch(''),
  apiKey: z.string().catch(''),
  model: z.string().catch(''),
})

const chatModelIdSchema = z.enum(
  CHAT_MODEL_OPTIONS.map((opt) => opt.id) as [string, ...string[]],
)
const applyModelIdSchema = z.enum(
  APPLY_MODEL_OPTIONS.map((opt) => opt.id) as [string, ...string[]],
)
const embeddingModelIdSchema = z.enum(
  EMBEDDING_MODEL_OPTIONS.map((opt) => opt.id) as [string, ...string[]],
)

const ragOptionsSchema = z.object({
  chunkSize: z.number().catch(1000),
  thresholdTokens: z.number().catch(8192),
  minSimilarity: z.number().catch(0.0),
  limit: z.number().catch(10),
  excludePatterns: z.array(z.string()).catch([]),
})

const smartCopilotSettingsSchema = z.object({
  // Version
  version: z.literal(SETTINGS_SCHEMA_VERSION).catch(SETTINGS_SCHEMA_VERSION),

  // API Keys
  openAIApiKey: z.string().catch(''),
  anthropicApiKey: z.string().catch(''),
  groqApiKey: z.string().catch(''),

  // Chat Models
  chatModelId: chatModelIdSchema.catch('anthropic/claude-3.5-sonnet-latest'),
  ollamaChatModel: ollamaModelSchema.catch({
    baseUrl: '',
    model: '',
  }),
  openAICompatibleChatModel: openAICompatibleModelSchema.catch({
    baseUrl: '',
    apiKey: '',
    model: '',
  }),

  // Apply Models
  applyModelId: applyModelIdSchema.catch('openai/gpt-4o-mini'),
  ollamaApplyModel: ollamaModelSchema.catch({
    baseUrl: '',
    model: '',
  }),
  openAICompatibleApplyModel: openAICompatibleModelSchema.catch({
    baseUrl: '',
    apiKey: '',
    model: '',
  }),

  // Embedding Models
  embeddingModelId: embeddingModelIdSchema.catch(
    'openai/text-embedding-3-small',
  ),
  ollamaEmbeddingModel: ollamaModelSchema.catch({
    baseUrl: '',
    model: '',
  }),

  // System Prompt
  systemPrompt: z.string().catch(''),

  // RAG Options
  ragOptions: ragOptionsSchema.catch({
    chunkSize: 1000,
    thresholdTokens: 8192,
    minSimilarity: 0.0,
    limit: 10,
    excludePatterns: [],
  }),
})

export type SmartCopilotSettings = z.infer<typeof smartCopilotSettingsSchema>

type Migration = {
  fromVersion: number
  toVersion: number
  migrate: (data: Record<string, unknown>) => Record<string, unknown>
}

const MIGRATIONS: Migration[] = [
  {
    fromVersion: 0,
    toVersion: 1,
    migrate: (data) => {
      const newData = { ...data }

      if ('chatModel' in newData && typeof newData.chatModel === 'string') {
        const CHAT_MODEL_MAP: Record<string, string> = {
          'claude-3.5-sonnet-latest': 'anthropic/claude-3.5-sonnet-latest',
          'gpt-4o': 'openai/gpt-4o',
          'gpt-4o-mini': 'openai/gpt-4o-mini',
          'llama-3.1-70b-versatile': 'groq/llama-3.1-70b-versatile',
          'llama3.1:8b': 'ollama',
        }
        newData.chatModelId =
          CHAT_MODEL_MAP[newData.chatModel] ??
          'anthropic/claude-3.5-sonnet-latest'
        delete newData.chatModel
      }
      if ('applyModel' in newData && typeof newData.applyModel === 'string') {
        const APPLY_MODEL_MAP: Record<string, string> = {
          'gpt-4o-mini': 'openai/gpt-4o-mini',
          'llama-3.1-8b-instant': 'groq/llama-3.1-8b-instant',
          'llama-3.1-70b-versatile': 'groq/llama-3.1-70b-versatile',
          'llama3.1:8b': 'ollama',
        }
        newData.applyModelId =
          APPLY_MODEL_MAP[newData.applyModel] ?? 'openai/gpt-4o-mini'
        delete newData.applyModel
      }
      if (
        'embeddingModel' in newData &&
        typeof newData.embeddingModel === 'string'
      ) {
        const EMBEDDING_MODEL_MAP: Record<string, string> = {
          'text-embedding-3-small': 'openai/text-embedding-3-small',
          'text-embedding-3-large': 'openai/text-embedding-3-large',
          'nomic-embed-text': 'ollama/nomic-embed-text',
          'mxbai-embed-large': 'ollama/mxbai-embed-large',
          'bge-m3': 'ollama/bge-m3',
        }
        newData.embeddingModelId =
          EMBEDDING_MODEL_MAP[newData.embeddingModel] ??
          'openai/text-embedding-3-small'
        delete newData.embeddingModel
      }
      if (
        'ollamaBaseUrl' in newData &&
        typeof newData.ollamaBaseUrl === 'string'
      ) {
        newData.ollamaChatModel = {
          baseUrl: newData.ollamaBaseUrl,
          model: '',
        }
        newData.ollamaApplyModel = {
          baseUrl: newData.ollamaBaseUrl,
          model: '',
        }
        newData.ollamaEmbeddingModel = {
          baseUrl: newData.ollamaBaseUrl,
          model: '',
        }
        delete newData.ollamaBaseUrl
      }

      return newData
    },
  },
]

function migrateSettings(
  data: Record<string, unknown>,
): Record<string, unknown> {
  let currentData = { ...data }
  const currentVersion = (currentData.version as number) ?? 0

  for (const migration of MIGRATIONS) {
    if (
      currentVersion >= migration.fromVersion &&
      currentVersion < migration.toVersion &&
      migration.toVersion <= SETTINGS_SCHEMA_VERSION
    ) {
      console.log(
        `Migrating settings from ${migration.fromVersion} to ${migration.toVersion}`,
      )
      currentData = migration.migrate(currentData)
    }
  }

  return currentData
}

export function parseSmartCopilotSettings(data: unknown): SmartCopilotSettings {
  try {
    const migratedData = migrateSettings(data as Record<string, unknown>)
    return smartCopilotSettingsSchema.parse(migratedData)
  } catch (error) {
    console.warn('Invalid settings provided, using defaults:', error)
    return smartCopilotSettingsSchema.parse({})
  }
}
