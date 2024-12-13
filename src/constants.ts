import { EmbeddingModelOption } from './types/embedding'
import { ModelOption } from './types/llm/model'

export const CHAT_VIEW_TYPE = 'smtcmp-chat-view'
export const APPLY_VIEW_TYPE = 'smtcmp-apply-view'

export const CHAT_MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'anthropic/claude-3.5-sonnet-latest',
    name: 'claude-3.5-sonnet (Recommended)',
    model: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-latest',
    },
  },
  {
    id: 'openai/gpt-4o',
    name: 'gpt-4o',
    model: {
      provider: 'openai',
      model: 'gpt-4o',
    },
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'gpt-4o-mini',
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
    },
  },
  {
    id: 'gemini/gemini-1.5-pro',
    name: 'gemini-1.5-pro',
    model: {
      provider: 'gemini',
      model: 'gemini-1.5-pro',
    },
  },
  {
    id: 'gemini/gemini-2.0-flash',
    name: 'gemini-2.0-flash',
    model: {
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp',
    },
  },
  {
    id: 'groq/llama-3.1-70b-versatile',
    name: 'llama-3.1-70b (Groq)',
    model: {
      provider: 'groq',
      model: 'llama-3.1-70b-versatile',
    },
  },
  {
    id: 'ollama',
    name: 'Ollama',
    model: {
      provider: 'ollama',
      model: '',
      baseURL: '',
    },
  },
  {
    id: 'openai-compatible',
    name: 'Custom (OpenAI Compatible)',
    model: {
      provider: 'openai-compatible',
      model: '',
      apiKey: '',
      baseURL: '',
    },
  },
]

export const APPLY_MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'openai/gpt-4o-mini',
    name: 'gpt-4o-mini (Recommended)',
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
    },
  },
  {
    id: 'anthropic/claude-3.5-haiku',
    name: 'claude-3.5-haiku',
    model: {
      provider: 'anthropic',
      model: 'claude-3-5-haiku-latest',
    },
  },
  {
    id: 'gemini/gemini-1.5-flash',
    name: 'gemini-1.5-flash',
    model: {
      provider: 'gemini',
      model: 'gemini-1.5-flash',
    },
  },
  {
    id: 'gemini/gemini-2.0-flash',
    name: 'gemini-2.0-flash',
    model: {
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp',
    },
  },
  {
    id: 'groq/llama-3.1-8b-instant',
    name: 'llama-3.1-8b (Groq)',
    model: {
      provider: 'groq',
      model: 'llama-3.1-8b-instant',
    },
  },
  {
    id: 'groq/llama-3.1-70b-versatile',
    name: 'llama-3.1-70b (Groq)',
    model: {
      provider: 'groq',
      model: 'llama-3.1-70b-versatile',
    },
  },
  {
    id: 'ollama',
    name: 'Ollama',
    model: {
      provider: 'ollama',
      model: '',
      baseURL: '',
    },
  },
  {
    id: 'openai-compatible',
    name: 'Custom (OpenAI Compatible)',
    model: {
      provider: 'openai-compatible',
      model: '',
      apiKey: '',
      baseURL: '',
    },
  },
]

// Update table exports in src/database/schema.ts when updating this
export const EMBEDDING_MODEL_OPTIONS: EmbeddingModelOption[] = [
  {
    id: 'openai/text-embedding-3-small',
    name: 'openai/text-embedding-3-small (Recommended)',
    model: {
      provider: 'openai',
      model: 'text-embedding-3-small',
    },
    dimension: 1536,
  },
  {
    id: 'openai/text-embedding-3-large',
    name: 'openai/text-embedding-3-large',
    model: {
      provider: 'openai',
      model: 'text-embedding-3-large',
    },
    dimension: 3072,
  },
  {
    id: 'gemini/text-embedding-004',
    name: 'gemini/text-embedding-004',
    model: {
      provider: 'gemini',
      model: 'text-embedding-004',
    },
    dimension: 768,
  },
  {
    name: 'ollama/nomic-embed-text',
    id: 'ollama/nomic-embed-text',
    model: {
      provider: 'ollama',
      model: 'nomic-embed-text',
      baseURL: '',
    },
    dimension: 768,
  },
  {
    name: 'ollama/mxbai-embed-large',
    id: 'ollama/mxbai-embed-large',
    model: {
      provider: 'ollama',
      model: 'mxbai-embed-large',
      baseURL: '',
    },
    dimension: 1024,
  },
  {
    name: 'ollama/bge-m3',
    id: 'ollama/bge-m3',
    model: {
      provider: 'ollama',
      model: 'bge-m3',
      baseURL: '',
    },
    dimension: 1024,
  },
]

// Pricing in dollars per million tokens
type ModelPricing = {
  input: number
  output: number
}

export const OPENAI_PRICES: Record<string, ModelPricing> = {
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
}

export const ANTHROPIC_PRICES: Record<string, ModelPricing> = {
  'claude-3-5-sonnet-latest': { input: 3, output: 15 },
  'claude-3-5-haiku-latest': { input: 1, output: 5 },
}

// Gemini is currently free for low rate limits
export const GEMINI_PRICES: Record<string, ModelPricing> = {
  'gemini-1.5-pro': { input: 0, output: 0 },
  'gemini-1.5-flash': { input: 0, output: 0 },
}

export const GROQ_PRICES: Record<string, ModelPricing> = {
  'llama-3.1-70b-versatile': { input: 0.59, output: 0.79 },
  'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
}

export const PGLITE_DB_PATH = '.smtcmp_vector_db.tar.gz'
