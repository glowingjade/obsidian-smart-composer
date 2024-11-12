export const CHAT_VIEW_TYPE = 'smtcmp-chat-view'
export const APPLY_VIEW_TYPE = 'smtcmp-apply-view'

export const CHAT_MODEL_OPTIONS = [
  {
    name: 'claude-3.5-sonnet (Recommended)',
    value: 'claude-3-5-sonnet-latest',
  },
  {
    name: 'gpt-4o',
    value: 'gpt-4o',
  },
  {
    name: 'gpt-4o-mini',
    value: 'gpt-4o-mini',
  },
  {
    name: 'gemini-1.5-pro',
    value: 'gemini-1.5-pro',
  },
  {
    name: 'llama-3.1-70b (Groq)',
    value: 'llama-3.1-70b-versatile',
  },
  {
    name: 'llama3.1:8b (Ollama)',
    value: 'llama3.1:8b',
  },
]

export const APPLY_MODEL_OPTIONS = [
  {
    name: 'gpt-4o-mini (Recommended)',
    value: 'gpt-4o-mini',
  },
  {
    name: 'gemini-1.5-flash',
    value: 'gemini-1.5-flash',
  },
  {
    name: 'gemini-1.5-flash-8b',
    value: 'gemini-1.5-flash-8b',
  },
  {
    name: 'llama-3.1-8b (Groq)',
    value: 'llama-3.1-8b-instant',
  },
  {
    name: 'llama3-8b (Groq)',
    value: 'llama3-8b-8192',
  },
  {
    name: 'llama-3.1-70b (Groq)',
    value: 'llama-3.1-70b-versatile',
  },
  {
    name: 'llama3.1:8b (Ollama)',
    value: 'llama3.1:8b',
  },
]

// Update table exports in src/database/schema.ts when updating this
export const EMBEDDING_MODEL_OPTIONS = [
  {
    name: 'text-embedding-3-small (Recommended)',
    value: 'text-embedding-3-small',
    dimension: 1536,
  },
  {
    name: 'text-embedding-3-large',
    value: 'text-embedding-3-large',
    dimension: 3072,
  },
  {
    name: 'nomic-embed-text (Ollama)',
    value: 'nomic-embed-text',
    dimension: 768,
  },
  {
    name: 'mxbai-embed-large (Ollama)',
    value: 'mxbai-embed-large',
    dimension: 1024,
  },
  {
    name: 'bge-m3 (Ollama)',
    value: 'bge-m3',
    dimension: 1024,
  },
]

export const PGLITE_DB_PATH = '.smtcmp_vector_db.tar.gz'
