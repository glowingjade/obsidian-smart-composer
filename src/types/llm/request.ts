// These types are based on the OpenRouter API specification
// https://openrouter.ai/docs/requests

import { ChatCompletionCreateParams } from 'openai/resources'

export type LLMRequestBase = {
  messages: RequestMessage[]
  model: string

  // LLM Parameters (https://openrouter.ai/docs/parameters)
  max_tokens?: number // Range: [1, context_length)
  temperature?: number // Range: [0, 2]
  top_p?: number // Range: (0, 1]
  frequency_penalty?: number // Range: [-2, 2]
  presence_penalty?: number // Range: [-2, 2]

  // Additional optional parameters
  logit_bias?: Record<number, number>

  // Only available for OpenAI
  prediction?: ChatCompletionCreateParams['prediction']
}

export type LLMRequestNonStreaming = LLMRequestBase & {
  stream?: false | null
}

export type LLMRequestStreaming = LLMRequestBase & {
  stream: true
}

export type LLMRequest = LLMRequestNonStreaming | LLMRequestStreaming

export type RequestMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export type LLMOptions = {
  signal?: AbortSignal
}
