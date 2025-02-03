import { z } from 'zod'

const baseEmbeddingModelSchema = z.object({
  providerId: z
    .string({
      required_error: 'provider ID is required',
    })
    .min(1, 'provider ID is required'),
  id: z
    .string({
      required_error: 'id is required',
    })
    .min(1, 'id is required'),
  model: z
    .string({
      required_error: 'model is required',
    })
    .min(1, 'model is required'),
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
