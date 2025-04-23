import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types'
import { z } from 'zod'

export type McpTool = Tool
export type McpToolCallResponse = CallToolResult

export const mcpServerParametersSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
})
export type MCPServerParameters = z.infer<typeof mcpServerParametersSchema>

export const mcpServerToolOptionsSchema = z.record(
  z.string(),
  z.object({
    disabled: z.boolean().optional(),
    allowAutoExecution: z.boolean().optional(),
  }),
)

export const mcpServerConfigSchema = z.object({
  id: z.string(),
  parameters: mcpServerParametersSchema,
  toolOptions: mcpServerToolOptionsSchema.optional().catch({}),
})
export type MCPServerConfig = z.infer<typeof mcpServerConfigSchema>
