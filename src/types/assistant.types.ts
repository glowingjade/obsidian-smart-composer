import { z } from 'zod'

// Assistant type definition
export const assistantSchema = z.object({
  id: z.string().min(1, 'Assistant ID cannot be empty'),
  name: z.string().min(1, 'Assistant name cannot be empty'),
  description: z.string().optional(),
  systemPrompt: z.string().min(1, 'System prompt cannot be empty'),
  icon: z.string().optional(),
  isDefault: z.boolean().default(false).optional(),
})

export type Assistant = z.infer<typeof assistantSchema>
