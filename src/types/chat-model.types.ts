import { z } from 'zod'

/**
 * TODO
 * 1. should remove groq llama models in default options?
 */

const baseChatModelSchema = z.object({
  providerId: z.string(),
  id: z.string(),
  model: z.string(),
})

// TODO: ensure providerType is valid
export const chatModelSchema = z.discriminatedUnion('providerType', [
  z.object({
    providerType: z.literal('openai'),
    ...baseChatModelSchema.shape,
    streamingDisabled: z.boolean().optional(),
  }),
  z.object({
    providerType: z.literal('anthropic'),
    ...baseChatModelSchema.shape,
  }),
  z.object({
    providerType: z.literal('gemini'),
    ...baseChatModelSchema.shape,
  }),
  z.object({
    providerType: z.literal('groq'),
    ...baseChatModelSchema.shape,
  }),
  z.object({
    providerType: z.literal('ollama'),
    ...baseChatModelSchema.shape,
  }),
  z.object({
    providerType: z.literal('openai-compatible'),
    ...baseChatModelSchema.shape,
  }),
])

export type ChatModel = z.infer<typeof chatModelSchema>
