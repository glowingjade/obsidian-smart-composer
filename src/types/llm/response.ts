// These types are based on the OpenRouter API specification
// https://openrouter.ai/docs/responses

export type LLMResponseBase = {
  id: string
  created?: number
  model: string
  system_fingerprint?: string
  usage?: ResponseUsage
}

export type LLMResponseNonStreaming = LLMResponseBase & {
  choices: NonStreamingChoice[]
  object: 'chat.completion'
}

export type LLMResponseStreaming = LLMResponseBase & {
  choices: StreamingChoice[]
  object: 'chat.completion.chunk'
}

export type LLMResponse = LLMResponseNonStreaming | LLMResponseStreaming

export type ResponseUsage = {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

type NonStreamingChoice = {
  finish_reason: string | null // Depends on the model. Ex: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'function_call'
  message: {
    content: string | null
    role: string
  }
  error?: Error
}

type StreamingChoice = {
  finish_reason: string | null
  delta: {
    content: string | null
    role?: string
  }
  error?: Error
}

type Error = {
  code: number // See "Error Handling" section
  message: string
}
