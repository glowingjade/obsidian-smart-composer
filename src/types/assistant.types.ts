import { z } from 'zod'

// 助手类型定义
export const assistantSchema = z.object({
  id: z.string().min(1, '助手ID不能为空'),
  name: z.string().min(1, '助手名称不能为空'),
  description: z.string().optional(),
  systemPrompt: z.string().min(1, '系统提示词不能为空'),
  icon: z.string().optional(),
  isDefault: z.boolean().default(false).optional(),
})

export type Assistant = z.infer<typeof assistantSchema>
