import { EmbeddingModelOption } from './types/embedding'
import { SmartCopilotSettings } from './types/settings'

export const CHAT_VIEW_TYPE = 'smtcmp-chat-view'
export const APPLY_VIEW_TYPE = 'smtcmp-apply-view'

export const DEFAULT_SETTINGS: SmartCopilotSettings = {
  openAIApiKey: '',
  groqApiKey: '',
  anthropicApiKey: '',
  chatModel: 'claude-3-5-sonnet-20240620',
  applyModel: 'gpt-4o-mini',
  embeddingModel: 'text-embedding-3-small',
  chunkOptions: {
    chunkSize: 1000,
  },
  ragOptions: {
    minSimilarity: 0.0,
    limit: 5,
  },
}

export const CHAT_MODEL_OPTIONS = [
  {
    name: 'claude-3.5-sonnet (Recommended)',
    value: 'claude-3-5-sonnet-20240620',
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
    name: 'llama-3.1-70b (Groq)',
    value: 'llama-3.1-70b-versatile',
  },
]

export const APPLY_MODEL_OPTIONS = [
  {
    name: 'gpt-4o-mini (Recommended)',
    value: 'gpt-4o-mini',
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
]

export const EMBEDDING_MODEL_OPTIONS: EmbeddingModelOption[] = [
  {
    name: 'text-embedding-3-small',
    value: 'text-embedding-3-small',
    dimension: 1536,
  },
  {
    name: 'text-embedding-3-large',
    value: 'text-embedding-3-large',
    dimension: 3072,
  },
]

export const PGLITE_DB_PATH = '.smtcmp_vector_db.tar.gz'
