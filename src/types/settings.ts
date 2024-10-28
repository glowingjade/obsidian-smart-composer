import { z } from 'zod'

import {
  APPLY_MODEL_OPTIONS,
  CHAT_MODEL_OPTIONS,
  EMBEDDING_MODEL_OPTIONS,
} from '../constants'

const chatModelSchema = z.enum(
  CHAT_MODEL_OPTIONS.map((opt) => opt.value) as [string, ...string[]],
)
const applyModelSchema = z.enum(
  APPLY_MODEL_OPTIONS.map((opt) => opt.value) as [string, ...string[]],
)
const embeddingModelSchema = z.enum(
  EMBEDDING_MODEL_OPTIONS.map((opt) => opt.value) as [string, ...string[]],
)

// Update settings.test.ts after changing this schema
const smartCopilotSettingsSchema = z.object({
  openAIApiKey: z.string().catch(''),
  groqApiKey: z.string().catch(''),
  anthropicApiKey: z.string().catch(''),
  ollamaBaseUrl: z.string().catch(''),
  chatModel: chatModelSchema.catch('claude-3-5-sonnet-latest'),
  applyModel: applyModelSchema.catch('gpt-4o-mini'),
  embeddingModel: embeddingModelSchema.catch('text-embedding-3-small'),
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
