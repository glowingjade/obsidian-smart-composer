// These types are based on the OpenRouter API specification
// https://openrouter.ai/docs/api-reference/overview#requests

import { ChatCompletionCreateParams, ReasoningEffort } from 'openai/resources'

import { ToolCallRequest } from '../tool-call.types'

export type LLMRequestBase = {
  messages: RequestMessage[]
  model: string

  // Tool calling
  tools?: RequestTool[]
  tool_choice?: RequestToolChoice

  // LLM Parameters (https://openrouter.ai/docs/api-reference/parameters)
  max_tokens?: number // Range: [1, context_length)
  temperature?: number // Range: [0, 2]
  top_p?: number // Range: (0, 1]
  frequency_penalty?: number // Range: [-2, 2]
  presence_penalty?: number // Range: [-2, 2]

  // Additional optional parameters
  logit_bias?: Record<number, number>

  // Only available for OpenAI
  prediction?: ChatCompletionCreateParams['prediction']

  // Only available for OpenAI reasoning models
  reasoning_effort?: ReasoningEffort

  // Only available for OpenAI search models and Perplexity
  web_search_options?: ChatCompletionCreateParams.WebSearchOptions
}

export type LLMRequestNonStreaming = LLMRequestBase & {
  stream?: false | null
}

export type LLMRequestStreaming = LLMRequestBase & {
  stream: true
}

export type LLMRequest = LLMRequestNonStreaming | LLMRequestStreaming

type TextContent = {
  type: 'text'
  text: string
}

type ImageContentPart = {
  type: 'image_url'
  image_url: {
    url: string // URL or base64 encoded image data
  }
}

export type ContentPart = TextContent | ImageContentPart

type RequestSystemMessage = {
  role: 'system'
  content: string
}
type RequestUserMessage = {
  role: 'user'
  content: string | ContentPart[]
}
type RequestAssistantMessage = {
  role: 'assistant'
  content: string
  tool_calls?: ToolCallRequest[]
}
type RequestToolMessage = {
  role: 'tool'
  tool_call: ToolCallRequest
  content: string // tool response
}
export type RequestMessage =
  | RequestSystemMessage
  | RequestUserMessage
  | RequestAssistantMessage
  | RequestToolMessage

export type LLMOptions = {
  signal?: AbortSignal
}

export type RequestTool = {
  type: 'function'
  function: FunctionDescription
}

export type RequestToolChoice =
  | 'none'
  | 'auto'
  | 'required'
  | {
      type: 'function'
      function: {
        name: string
      }
    }

type FunctionDescription = {
  description?: string
  name: string
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
  }
}
