import { z } from 'zod'

import { DEFAULT_PROVIDER_IDS } from './provider.types'

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

export const DEFAULT_CHAT_MODELS: readonly ChatModel[] = [
  {
    providerType: 'anthropic',
    providerId: DEFAULT_PROVIDER_IDS.anthropic,
    id: 'claude-3.5-sonnet',
    model: 'claude-3-5-sonnet-latest',
  },
  {
    providerType: 'openai',
    providerId: DEFAULT_PROVIDER_IDS.openai,
    id: 'gpt-4o',
    model: 'gpt-4o',
  },
  {
    providerType: 'openai',
    providerId: DEFAULT_PROVIDER_IDS.openai,
    id: 'gpt-4o-mini',
    model: 'gpt-4o-mini',
  },
  {
    providerType: 'gemini',
    providerId: DEFAULT_PROVIDER_IDS.gemini,
    id: 'gemini-1.5-pro',
    model: 'gemini-1.5-pro',
  },
  {
    providerType: 'gemini',
    providerId: DEFAULT_PROVIDER_IDS.gemini,
    id: 'gemini-2.0-flash',
    model: 'gemini-2.0-flash-exp',
  },
  {
    providerType: 'gemini',
    providerId: DEFAULT_PROVIDER_IDS.gemini,
    id: 'gemini-2.0-flash-thinking',
    model: 'gemini-2.0-flash-thinking-exp',
  },
  {
    providerType: 'gemini',
    providerId: DEFAULT_PROVIDER_IDS.gemini,
    id: 'gemini-exp-1206',
    model: 'gemini-exp-1206',
  },
  {
    providerType: 'groq',
    providerId: DEFAULT_PROVIDER_IDS.groq,
    id: 'groq/llama-3.1-70b',
    model: 'llama-3.1-70b-versatile',
  },
  {
    providerType: 'openai',
    providerId: DEFAULT_PROVIDER_IDS.openai,
    id: 'o1',
    model: 'o1',
    streamingDisabled: true, // currently, o1 API doesn't support streaming
  },
  {
    providerType: 'anthropic',
    providerId: DEFAULT_PROVIDER_IDS.anthropic,
    id: 'claude-3.5-haiku',
    model: 'claude-3-5-haiku-latest',
  },
  {
    providerType: 'gemini',
    providerId: DEFAULT_PROVIDER_IDS.gemini,
    id: 'gemini-1.5-flash',
    model: 'gemini-1.5-flash',
  },
  {
    providerType: 'groq',
    providerId: DEFAULT_PROVIDER_IDS.groq,
    id: 'groq/llama-3.1-8b',
    model: 'llama-3.1-8b-instant',
  },
]
