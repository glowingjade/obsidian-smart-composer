import { z } from 'zod'

import { SettingMigration, SmartCopilotSettings } from '../setting.types'

type NativeLLMModel = {
  provider: 'openai' | 'anthropic' | 'gemini' | 'groq'
  model: string
  supportsStreaming?: boolean
}

type OllamaModel = {
  provider: 'ollama'
  baseURL: string
  model: string
  supportsStreaming?: boolean
}

type OpenAICompatibleModel = {
  provider: 'openai-compatible'
  apiKey: string
  baseURL: string
  model: string
  supportsStreaming?: boolean
}

type LLMModel = NativeLLMModel | OllamaModel | OpenAICompatibleModel

type ModelOption = {
  id: string
  name: string
  model: LLMModel
}

type EmbeddingModelId =
  | 'openai/text-embedding-3-small'
  | 'openai/text-embedding-3-large'
  | 'gemini/text-embedding-004'
  | 'ollama/nomic-embed-text'
  | 'ollama/mxbai-embed-large'
  | 'ollama/bge-m3'

type EmbeddingModelOption = {
  id: EmbeddingModelId
  name: string
  model: LLMModel
  dimension: number
}

const CHAT_MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'anthropic/claude-3.5-sonnet-latest',
    name: 'claude-3.5-sonnet (Recommended)',
    model: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-latest',
    },
  },
  {
    id: 'openai/gpt-4o',
    name: 'gpt-4o',
    model: {
      provider: 'openai',
      model: 'gpt-4o',
    },
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'gpt-4o-mini',
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
    },
  },
  {
    id: 'gemini/gemini-1.5-pro',
    name: 'gemini-1.5-pro',
    model: {
      provider: 'gemini',
      model: 'gemini-1.5-pro',
    },
  },
  {
    id: 'gemini/gemini-2.0-flash',
    name: 'gemini-2.0-flash',
    model: {
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp',
    },
  },
  {
    id: 'gemini/gemini-2.0-flash-thinking',
    name: 'gemini-2.0-flash-thinking',
    model: {
      provider: 'gemini',
      model: 'gemini-2.0-flash-thinking-exp',
    },
  },
  {
    id: 'gemini/gemini-exp-1206',
    name: 'gemini-exp-1206',
    model: {
      provider: 'gemini',
      model: 'gemini-exp-1206',
    },
  },
  {
    id: 'groq/llama-3.1-70b-versatile',
    name: 'llama-3.1-70b (Groq)',
    model: {
      provider: 'groq',
      model: 'llama-3.1-70b-versatile',
    },
  },
  {
    id: 'ollama',
    name: 'Ollama',
    model: {
      provider: 'ollama',
      model: '',
      baseURL: '',
    },
  },
  {
    id: 'openai-compatible',
    name: 'Custom (OpenAI Compatible)',
    model: {
      provider: 'openai-compatible',
      model: '',
      apiKey: '',
      baseURL: '',
    },
  },
  {
    id: 'openai/o1',
    name: 'OpenAI o1 (Non-Streaming)',
    model: {
      provider: 'openai',
      model: 'o1',
      supportsStreaming: false,
    },
  },
]

const APPLY_MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'openai/gpt-4o-mini',
    name: 'gpt-4o-mini (Recommended)',
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
    },
  },
  {
    id: 'anthropic/claude-3.5-haiku',
    name: 'claude-3.5-haiku',
    model: {
      provider: 'anthropic',
      model: 'claude-3-5-haiku-latest',
    },
  },
  {
    id: 'gemini/gemini-1.5-flash',
    name: 'gemini-1.5-flash',
    model: {
      provider: 'gemini',
      model: 'gemini-1.5-flash',
    },
  },
  {
    id: 'gemini/gemini-2.0-flash',
    name: 'gemini-2.0-flash',
    model: {
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp',
    },
  },
  {
    id: 'groq/llama-3.1-8b-instant',
    name: 'llama-3.1-8b (Groq)',
    model: {
      provider: 'groq',
      model: 'llama-3.1-8b-instant',
    },
  },
  {
    id: 'groq/llama-3.1-70b-versatile',
    name: 'llama-3.1-70b (Groq)',
    model: {
      provider: 'groq',
      model: 'llama-3.1-70b-versatile',
    },
  },
  {
    id: 'ollama',
    name: 'Ollama',
    model: {
      provider: 'ollama',
      model: '',
      baseURL: '',
    },
  },
  {
    id: 'openai-compatible',
    name: 'Custom (OpenAI Compatible)',
    model: {
      provider: 'openai-compatible',
      model: '',
      apiKey: '',
      baseURL: '',
    },
  },
]

const EMBEDDING_MODEL_OPTIONS: EmbeddingModelOption[] = [
  {
    id: 'openai/text-embedding-3-small',
    name: 'openai/text-embedding-3-small (Recommended)',
    model: {
      provider: 'openai',
      model: 'text-embedding-3-small',
    },
    dimension: 1536,
  },
  {
    id: 'openai/text-embedding-3-large',
    name: 'openai/text-embedding-3-large',
    model: {
      provider: 'openai',
      model: 'text-embedding-3-large',
    },
    dimension: 3072,
  },
  {
    id: 'gemini/text-embedding-004',
    name: 'gemini/text-embedding-004',
    model: {
      provider: 'gemini',
      model: 'text-embedding-004',
    },
    dimension: 768,
  },
  {
    id: 'ollama/nomic-embed-text',
    name: 'ollama/nomic-embed-text',
    model: {
      provider: 'ollama',
      model: 'nomic-embed-text',
      baseURL: '',
    },
    dimension: 768,
  },
  {
    id: 'ollama/mxbai-embed-large',
    name: 'ollama/mxbai-embed-large',
    model: {
      provider: 'ollama',
      model: 'mxbai-embed-large',
      baseURL: '',
    },
    dimension: 1024,
  },
  {
    id: 'ollama/bge-m3',
    name: 'ollama/bge-m3',
    model: {
      provider: 'ollama',
      model: 'bge-m3',
      baseURL: '',
    },
    dimension: 1024,
  },
]

const SETTINGS_SCHEMA_VERSION = 1

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
  includePatterns: z.array(z.string()).catch([]),
})
const smartCopilotSettingsSchemaV1 = z.object({
  // Version
  version: z.literal(SETTINGS_SCHEMA_VERSION).catch(SETTINGS_SCHEMA_VERSION),

  // API Keys
  openAIApiKey: z.string().catch(''),
  anthropicApiKey: z.string().catch(''),
  geminiApiKey: z.string().catch(''),
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
    includePatterns: [],
  }),
})
type SmartCopilotSettingsV1 = z.infer<typeof smartCopilotSettingsSchemaV1>

export const migrateFrom1To2: SettingMigration['migrate'] = (
  _data: SmartCopilotSettingsV1,
): SmartCopilotSettings => {
  throw new Error('Not implemented')
}
