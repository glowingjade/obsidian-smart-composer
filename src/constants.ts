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
    name: 'text-embedding-3-small (Recommended)',
    model: {
      provider: 'openai',
      model: 'text-embedding-3-small',
    },
    dimension: 1536,
  },
  {
    id: 'openai/text-embedding-3-large',
    name: 'text-embedding-3-large',
    model: {
      provider: 'openai',
      model: 'text-embedding-3-large',
    },
    dimension: 3072,
  },
  {
    name: 'nomic-embed-text (Ollama)',
    id: 'ollama/nomic-embed-text',
    model: {
      provider: 'ollama',
      model: 'nomic-embed-text',
      baseURL: '',
    },
    dimension: 768,
  },
  {
    name: 'mxbai-embed-large (Ollama)',
    id: 'ollama/mxbai-embed-large',
    model: {
      provider: 'ollama',
      model: 'mxbai-embed-large',
      baseURL: '',
    },
    dimension: 1024,
  },
  {
    name: 'bge-m3 (Ollama)',
    id: 'ollama/bge-m3',
    model: {
      provider: 'ollama',
      model: 'bge-m3',
      baseURL: '',
    },
    dimension: 1024,
  },
]

export const PGLITE_DB_PATH = '.smtcmp_vector_db.tar.gz'
