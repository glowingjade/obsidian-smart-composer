import { z } from 'zod'

import {
  DEFAULT_CHAT_MODELS,
  DEFAULT_EMBEDDING_MODELS,
  DEFAULT_PROVIDERS,
} from '../../constants'
import { chatModelSchema } from '../../types/chat-model.types'
import { embeddingModelSchema } from '../../types/embedding-model.types'
import { llmProviderSchema } from '../../types/provider.types'

const ragOptionsSchema = z.object({
  chunkSize: z.number().catch(1000),
  thresholdTokens: z.number().catch(8192),
  minSimilarity: z.number().catch(0.0),
  limit: z.number().catch(10),
  excludePatterns: z.array(z.string()).catch([]),
  includePatterns: z.array(z.string()).catch([]),
})

export const SETTINGS_SCHEMA_VERSION = 2

/**
 * TODO
 * 1. since default chat model and apply model shares same model list, we should let users know that lighter model is good for apply feature.
 * 2. Let users hide default models in model dropdown
 * 3. show recommended for models
 * 4. Add tests that ensure default provider/model ids are unique (can we enforce it by zod schema?)
 * 5. On migration, should create provider if user have set openAI compatible models (multiple ones if settings differ)
 * 6. validate settings with zod schema before saving on SettingTab
 * 7. Ensure provider for chat/embedding models exists (should remove models when provider is removed)
 * 8. delete embeddings in database when embedding model is removed
 * 9. check if provider is valid when adding embedding model (because some providers don't support embedding)
 * 10. When adding embedding model, show message about its dimension (only some dimensions support indexing, so for models that's not included in supported dimensions, performance could be bad)
 * 11. When adding chat/embedding model, check if it's valid (e.g. prevent adding chat model to embedding list, or embedding model to chat list)
 */

/**
 * Settings
 */

// TODO: rename smart copilot to smart composer
export const smartCopilotSettingsSchema = z.object({
  // Version
  version: z.literal(SETTINGS_SCHEMA_VERSION).catch(SETTINGS_SCHEMA_VERSION),

  // TODO: ensure predefined providers exists
  providers: z.array(llmProviderSchema).catch([...DEFAULT_PROVIDERS]),

  chatModels: z.array(chatModelSchema).catch([...DEFAULT_CHAT_MODELS]),

  embeddingModels: z
    .array(embeddingModelSchema)
    .catch([...DEFAULT_EMBEDDING_MODELS]),

  chatModelId: z.string().catch(DEFAULT_CHAT_MODELS[0].id), // model for default chat feature
  applyModelId: z
    .string()
    .catch(
      DEFAULT_CHAT_MODELS.find((v) => v.id === 'gpt-4o-mini')?.id ??
        DEFAULT_CHAT_MODELS[0].id,
    ), // model for apply feature
  embeddingModelId: z.string().catch(DEFAULT_EMBEDDING_MODELS[0].id), // model for embedding

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
export type SmartCopilotSettings = z.infer<typeof smartCopilotSettingsSchema>

export type SettingMigration = {
  fromVersion: number
  toVersion: number
  migrate: (data: Record<string, unknown>) => Record<string, unknown>
}
