import { z } from 'zod'

import { DEFAULT_PROVIDER_IDS } from './provider.types'

const baseEmbeddingModelSchema = z.object({
  providerId: z.string(),
  id: z.string(),
  model: z.string(),
  dimension: z.number(), // default dimension of the model
})

// TODO: ensure providerType is valid
export const embeddingModelSchema = z.discriminatedUnion('providerType', [
  z.object({
    providerType: z.literal('openai'),
    ...baseEmbeddingModelSchema.shape,
  }),
  z.object({
    providerType: z.literal('anthropic'),
    ...baseEmbeddingModelSchema.shape,
  }),
  z.object({
    providerType: z.literal('gemini'),
    ...baseEmbeddingModelSchema.shape,
  }),
  z.object({
    providerType: z.literal('groq'),
    ...baseEmbeddingModelSchema.shape,
  }),
  z.object({
    providerType: z.literal('ollama'),
    ...baseEmbeddingModelSchema.shape,
  }),
  z.object({
    providerType: z.literal('openai-compatible'),
    ...baseEmbeddingModelSchema.shape,
  }),
])

export type EmbeddingModel = z.infer<typeof embeddingModelSchema>

export const DEFAULT_EMBEDDING_MODELS: readonly EmbeddingModel[] = [
  {
    providerType: 'openai',
    providerId: DEFAULT_PROVIDER_IDS.openai,
    id: 'openai/text-embedding-3-small',
    model: 'text-embedding-3-small',
    dimension: 1536,
  },
  {
    providerType: 'openai',
    providerId: DEFAULT_PROVIDER_IDS.openai,
    id: 'openai/text-embedding-3-large',
    model: 'text-embedding-3-large',
    dimension: 3072,
  },
  {
    providerType: 'gemini',
    providerId: DEFAULT_PROVIDER_IDS.gemini,
    id: 'gemini/text-embedding-004',
    model: 'text-embedding-004',
    dimension: 768,
  },
  {
    providerType: 'ollama',
    providerId: DEFAULT_PROVIDER_IDS.ollama,
    id: 'ollama/nomic-embed-text',
    model: 'nomic-embed-text',
    dimension: 768,
  },
  {
    providerType: 'ollama',
    providerId: DEFAULT_PROVIDER_IDS.ollama,
    id: 'ollama/mxbai-embed-large',
    model: 'mxbai-embed-large',
    dimension: 1024,
  },
  {
    providerType: 'ollama',
    providerId: DEFAULT_PROVIDER_IDS.ollama,
    id: 'ollama/bge-m3',
    model: 'bge-m3',
    dimension: 1024,
  },
]
