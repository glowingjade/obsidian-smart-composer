import { z } from 'zod'

export const baseLlmProviderSchema = z.object({
  id: z.string().min(1, 'id is required'),
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
  additionalSettings: z.record(z.string(), z.string()).optional(),
})

/**
 * When adding a new provider, make sure to update these files:
 * - src/constants.ts
 * - src/types/chat-model.types.ts
 * - src/types/embedding-model.types.ts
 * - src/core/llm/manager.ts
 */
export const llmProviderSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('anthropic-plan'),
    ...baseLlmProviderSchema.shape,
    oauth: z
      .object({
        accessToken: z.string(),
        refreshToken: z.string(),
        expiresAt: z.number(),
        accountId: z.string().optional(),
      })
      .optional(),
  }),
  z.object({
    type: z.literal('openai-plan'),
    ...baseLlmProviderSchema.shape,
    oauth: z
      .object({
        accessToken: z.string(),
        refreshToken: z.string(),
        expiresAt: z.number(),
        accountId: z.string().optional(),
      })
      .optional(),
  }),
  z.object({
    type: z.literal('gemini-plan'),
    ...baseLlmProviderSchema.shape,
    oauth: z
      .object({
        accessToken: z.string(),
        refreshToken: z.string(),
        expiresAt: z.number(),
        projectId: z.string().optional(),
        managedProjectId: z.string().optional(),
        email: z.string().optional(),
      })
      .optional(),
  }),
  z.object({
    type: z.literal('anthropic'),
    ...baseLlmProviderSchema.shape,
  }),
  z.object({
    type: z.literal('openai'),
    ...baseLlmProviderSchema.shape,
  }),
  z.object({
    type: z.literal('gemini'),
    ...baseLlmProviderSchema.shape,
  }),
  z.object({
    type: z.literal('xai'),
    ...baseLlmProviderSchema.shape,
  }),
  z.object({
    type: z.literal('deepseek'),
    ...baseLlmProviderSchema.shape,
  }),
  z.object({
    type: z.literal('perplexity'),
    ...baseLlmProviderSchema.shape,
  }),
  z.object({
    type: z.literal('mistral'),
    ...baseLlmProviderSchema.shape,
  }),
  z.object({
    type: z.literal('openrouter'),
    ...baseLlmProviderSchema.shape,
  }),
  z.object({
    type: z.literal('ollama'),
    ...baseLlmProviderSchema.shape,
  }),
  z.object({
    type: z.literal('lm-studio'),
    ...baseLlmProviderSchema.shape,
  }),
  z.object({
    type: z.literal('azure-openai'),
    ...baseLlmProviderSchema.shape,
    additionalSettings: z.object({
      deployment: z
        .string({
          required_error: 'deployment is required',
        })
        .min(1, 'deployment is required'),
      apiVersion: z
        .string({
          required_error: 'apiVersion is required',
        })
        .min(1, 'apiVersion is required'),
    }),
  }),
  z.object({
    type: z.literal('openai-compatible'),
    ...baseLlmProviderSchema.shape,
    baseUrl: z
      .string({
        required_error: 'base URL is required',
      })
      .min(1, 'base URL is required'),
    additionalSettings: z
      .object({
        noStainless: z.boolean().optional(),
      })
      .optional(),
  }),
])

export type LLMProvider = z.infer<typeof llmProviderSchema>
export type LLMProviderType = LLMProvider['type']
