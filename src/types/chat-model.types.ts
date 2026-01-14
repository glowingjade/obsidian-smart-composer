import { z } from 'zod'

import { PromptLevel } from './prompt-level.types'

const baseChatModelSchema = z.object({
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
  promptLevel: z
    .nativeEnum(PromptLevel)
    .default(PromptLevel.Default)
    .optional(),
  enable: z.boolean().default(true).optional(),
})

export const chatModelSchema = z.discriminatedUnion('providerType', [
  z.object({
    providerType: z.literal('openai'),
    ...baseChatModelSchema.shape,
    reasoning: z
      .object({
        enabled: z.boolean(),
        reasoning_effort: z.string().optional(),
      })
      .optional(),
  }),
  z.object({
    providerType: z.literal('anthropic'),
    ...baseChatModelSchema.shape,
    thinking: z
      .object({
        enabled: z.boolean(),
        budget_tokens: z.number(),
      })
      .optional(),
  }),
  z.object({
    providerType: z.literal('gemini'),
    ...baseChatModelSchema.shape,
    thinking: z
      .object({
        enabled: z.boolean(),
        // 'level' for Gemini 3 models, 'budget' for Gemini 2.5 models
        control_mode: z.enum(['level', 'budget']).optional(),
        // For Gemini 3 models
        thinking_level: z.enum(['minimal', 'low', 'medium', 'high']).optional(),
        // For Gemini 2.5 models: -1 for dynamic, 0 to disable, or specific token count
        thinking_budget: z.number().optional(),
        // Return thought summaries in response
        include_thoughts: z.boolean().optional(),
      })
      .optional(),
  }),
  z.object({
    providerType: z.literal('xai'),
    ...baseChatModelSchema.shape,
  }),
  z.object({
    providerType: z.literal('deepseek'),
    ...baseChatModelSchema.shape,
  }),
  z.object({
    providerType: z.literal('mistral'),
    ...baseChatModelSchema.shape,
  }),
  z.object({
    providerType: z.literal('perplexity'),
    ...baseChatModelSchema.shape,
    web_search_options: z
      .object({
        search_context_size: z.string(),
      })
      .optional(),
  }),
  z.object({
    providerType: z.literal('openrouter'),
    ...baseChatModelSchema.shape,
  }),
  z.object({
    providerType: z.literal('ollama'),
    ...baseChatModelSchema.shape,
  }),
  z.object({
    providerType: z.literal('lm-studio'),
    ...baseChatModelSchema.shape,
  }),
  z.object({
    providerType: z.literal('azure-openai'),
    ...baseChatModelSchema.shape,
  }),
  z.object({
    providerType: z.literal('openai-compatible'),
    ...baseChatModelSchema.shape,
  }),
])

export type ChatModel = z.infer<typeof chatModelSchema>
