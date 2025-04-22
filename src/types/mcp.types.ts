import { z } from 'zod'

export const mcpServerParametersSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
})
export type MCPServerParameters = z.infer<typeof mcpServerParametersSchema>

export const mcpServerConfigSchema = z.object({
  id: z.string(),
  parameters: mcpServerParametersSchema,
})
export type MCPServerConfig = z.infer<typeof mcpServerConfigSchema>
