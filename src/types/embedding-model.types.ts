import { z } from 'zod'

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
