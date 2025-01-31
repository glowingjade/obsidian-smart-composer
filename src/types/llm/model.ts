// TODO: remove these types

export type NativeLLMModel = {
  provider: 'openai' | 'anthropic' | 'gemini' | 'groq'
  model: string
  supportsStreaming?: boolean
}

export type OllamaModel = {
  provider: 'ollama'
  baseURL: string
  model: string
  supportsStreaming?: boolean
}

export type OpenAICompatibleModel = {
  provider: 'openai-compatible'
  apiKey: string
  baseURL: string
  model: string
  supportsStreaming?: boolean
}

export type LLMModel = NativeLLMModel | OllamaModel | OpenAICompatibleModel

export type ModelOption = {
  id: string
  name: string
  model: LLMModel
}
