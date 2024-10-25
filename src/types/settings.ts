import { z } from 'zod'

const smartCopilotSettingsSchema = z.object({
  openAIApiKey: z.string().default(''),
  groqApiKey: z.string().default(''),
  anthropicApiKey: z.string().default(''),
  useOllama: z.boolean().default(false),
  chatModel: z.string().default('claude-3-5-sonnet-20240620'),
  applyModel: z.string().default('gpt-4o-mini'),
  embeddingModel: z.string().default('text-embedding-3-small'),
  ragOptions: z
    .object({
      chunkSize: z.number().default(1000),
      thresholdTokens: z.number().default(8192),
      minSimilarity: z.number().default(0.0),
      limit: z.number().default(10),
    })
    .default({}),
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
