import { z } from 'zod'

import {
  APPLY_MODEL_OPTIONS,
  CHAT_MODEL_OPTIONS,
  EMBEDDING_MODEL_OPTIONS,
} from '../constants'

const chatModelIdSchema = z.enum(
  CHAT_MODEL_OPTIONS.map((opt) => opt.id) as [string, ...string[]],
)
const applyModelIdSchema = z.enum(
  APPLY_MODEL_OPTIONS.map((opt) => opt.id) as [string, ...string[]],
)
const embeddingModelIdSchema = z.enum(
  EMBEDDING_MODEL_OPTIONS.map((opt) => opt.id) as [string, ...string[]],
)
const ollamaModelSchema = z.object({
  baseUrl: z.string().catch(''),
  model: z.string().catch(''),
})
const openAICompatibleModelSchema = z.object({
  baseUrl: z.string().catch(''),
  apiKey: z.string().catch(''),
  model: z.string().catch(''),
})

// Update settings.test.ts after changing this schema
const smartCopilotSettingsSchema = z.object({
  openAIApiKey: z.string().catch(''),
  anthropicApiKey: z.string().catch(''),
  groqApiKey: z.string().catch(''),

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

  embeddingModelId: embeddingModelIdSchema.catch(
    'openai/text-embedding-3-small',
  ),
  ollamaEmbeddingModel: ollamaModelSchema.catch({
    baseUrl: '',
    model: '',
  }),

  systemPrompt: z.string().catch(''),
  ragOptions: z
    .object({
      chunkSize: z.number().catch(1000),
      thresholdTokens: z.number().catch(8192),
      minSimilarity: z.number().catch(0.0),
      limit: z.number().catch(10),
    })
    .catch({
      chunkSize: 1000,
      thresholdTokens: 8192,
      minSimilarity: 0.0,
      limit: 10,
    }),
})

export type SmartCopilotSettings = z.infer<typeof smartCopilotSettingsSchema>

export function parseSmartCopilotSettings(data: unknown): SmartCopilotSettings {
  try {
    return smartCopilotSettingsSchema.parse(data)
  } catch (error) {
    console.warn('Invalid settings provided, using defaults:', error)
    return smartCopilotSettingsSchema.parse({})
  }
}
