/**
 * Decisions
 * 1. Let users to add custom providers, and name id as they want. (If there's collision in the future, we'll just overwrite it)
 * 2. Provider types are predefined as it needs to be implemented on our side.
 * 3. Provier settings schema can be different from provider type.
 * 4. Users can't remove default providers and models. (What's being added as default can change in the future.)
 * 5. Prevent duplicate id for provider and models. Also don't allow using default provider/model ids.
 * 6. If user deletes provider, then corresponding models also should be deleted.
 */
// TODO: would it be better to flatten out provider/model settings? so that provider settings sit inside model settings.
// it could be annoying to add API keys for every model I want to use, but easier to understand.
// but if I provide default provider and models first, it wouldn't be a problem for onboarding. Users just have to input api key and use.

import { z } from 'zod'

// TODO: there may exists additional settings for specific provider types (e.g. Azure OpenAI required deployment name)
// TODO: check if each provider type allow overriding baseUrl and apiKey. If not, remove those settings.
export const baseLlmProviderSchema = z.object({
  id: z.string(),
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
})

export const llmProviderSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('openai'),
    ...baseLlmProviderSchema.shape,
  }),
  z.object({
    type: z.literal('anthropic'),
    ...baseLlmProviderSchema.shape,
  }),
  z.object({
    type: z.literal('gemini'),
    ...baseLlmProviderSchema.shape,
  }),
  z.object({
    type: z.literal('groq'),
    ...baseLlmProviderSchema.shape,
  }),
  z.object({
    type: z.literal('ollama'),
    ...baseLlmProviderSchema.shape,
  }),
  z.object({
    type: z.literal('openai-compatible'),
    ...baseLlmProviderSchema.shape,
  }),
])

export type LLMProvider = z.infer<typeof llmProviderSchema>
export type LLMProviderType = LLMProvider['type']

export const DEFAULT_PROVIDER_IDS = {
  openai: 'openai',
  anthropic: 'anthropic',
  gemini: 'gemini',
  groq: 'groq',
  ollama: 'ollama',
  'openai-compatible': null, // no default provider for this type
} satisfies Record<LLMProviderType, string | null>

export const DEFAULT_PROVIDERS: readonly LLMProvider[] = [
  {
    type: 'openai',
    id: DEFAULT_PROVIDER_IDS.openai,
  },
  {
    type: 'anthropic',
    id: DEFAULT_PROVIDER_IDS.anthropic,
  },
  {
    type: 'gemini',
    id: DEFAULT_PROVIDER_IDS.gemini,
  },
  {
    type: 'groq',
    id: DEFAULT_PROVIDER_IDS.groq,
  },
  {
    type: 'ollama',
    id: DEFAULT_PROVIDER_IDS.ollama,
  },
]
