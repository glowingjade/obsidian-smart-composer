import { ChatModel } from './types/chat-model.types'
import { EmbeddingModel } from './types/embedding-model.types'
import { LLMProvider, LLMProviderType } from './types/provider.types'

export const CHAT_VIEW_TYPE = 'smtcmp-chat-view'
export const APPLY_VIEW_TYPE = 'smtcmp-apply-view'

// Pricing in dollars per million tokens
type ModelPricing = {
  input: number
  output: number
}

// TODO: ensure we use model name (not our id) on checking price
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

export const DEFAULT_PROVIDER_IDS = {
  openai: 'openai',
  anthropic: 'anthropic',
  gemini: 'gemini',
  groq: 'groq',
  ollama: 'ollama',
  'openai-compatible': null, // no default provider for this type
} satisfies Record<LLMProviderType, string | null>

export const DEFAULT_PROVIDERS: readonly LLMProvider[] = [
  {
    type: 'openai',
    id: DEFAULT_PROVIDER_IDS.openai,
  },
  {
    type: 'anthropic',
    id: DEFAULT_PROVIDER_IDS.anthropic,
  },
  {
    type: 'gemini',
    id: DEFAULT_PROVIDER_IDS.gemini,
  },
  {
    type: 'groq',
    id: DEFAULT_PROVIDER_IDS.groq,
  },
  {
    type: 'ollama',
    id: DEFAULT_PROVIDER_IDS.ollama,
  },
]

export const DEFAULT_CHAT_MODELS: readonly ChatModel[] = [
  {
    providerType: 'anthropic',
    providerId: DEFAULT_PROVIDER_IDS.anthropic,
    id: 'claude-3.5-sonnet',
    model: 'claude-3-5-sonnet-latest',
  },
  {
    providerType: 'openai',
    providerId: DEFAULT_PROVIDER_IDS.openai,
    id: 'gpt-4o',
    model: 'gpt-4o',
  },
  {
    providerType: 'openai',
    providerId: DEFAULT_PROVIDER_IDS.openai,
    id: 'gpt-4o-mini',
    model: 'gpt-4o-mini',
  },
  {
    providerType: 'gemini',
    providerId: DEFAULT_PROVIDER_IDS.gemini,
    id: 'gemini-1.5-pro',
    model: 'gemini-1.5-pro',
  },
  {
    providerType: 'gemini',
    providerId: DEFAULT_PROVIDER_IDS.gemini,
    id: 'gemini-2.0-flash',
    model: 'gemini-2.0-flash-exp',
  },
  {
    providerType: 'gemini',
    providerId: DEFAULT_PROVIDER_IDS.gemini,
    id: 'gemini-2.0-flash-thinking',
    model: 'gemini-2.0-flash-thinking-exp',
  },
  {
    providerType: 'gemini',
    providerId: DEFAULT_PROVIDER_IDS.gemini,
    id: 'gemini-exp-1206',
    model: 'gemini-exp-1206',
  },
  {
    providerType: 'groq',
    providerId: DEFAULT_PROVIDER_IDS.groq,
    id: 'groq/llama-3.1-70b',
    model: 'llama-3.1-70b-versatile',
  },
  {
    providerType: 'openai',
    providerId: DEFAULT_PROVIDER_IDS.openai,
    id: 'o1',
    model: 'o1',
    streamingDisabled: true, // currently, o1 API doesn't support streaming
  },
  {
    providerType: 'anthropic',
    providerId: DEFAULT_PROVIDER_IDS.anthropic,
    id: 'claude-3.5-haiku',
    model: 'claude-3-5-haiku-latest',
  },
  {
    providerType: 'gemini',
    providerId: DEFAULT_PROVIDER_IDS.gemini,
    id: 'gemini-1.5-flash',
    model: 'gemini-1.5-flash',
  },
  {
    providerType: 'groq',
    providerId: DEFAULT_PROVIDER_IDS.groq,
    id: 'groq/llama-3.1-8b',
    model: 'llama-3.1-8b-instant',
  },
]

export const DEFAULT_EMBEDDING_MODELS: readonly EmbeddingModel[] = [
  {
    providerType: 'openai',
    providerId: DEFAULT_PROVIDER_IDS.openai,
    id: 'openai/text-embedding-3-small',
    model: 'text-embedding-3-small',
    dimension: 1536,
  },
  {
    providerType: 'openai',
    providerId: DEFAULT_PROVIDER_IDS.openai,
    id: 'openai/text-embedding-3-large',
    model: 'text-embedding-3-large',
    dimension: 3072,
  },
  {
    providerType: 'gemini',
    providerId: DEFAULT_PROVIDER_IDS.gemini,
    id: 'gemini/text-embedding-004',
    model: 'text-embedding-004',
    dimension: 768,
  },
  {
    providerType: 'ollama',
    providerId: DEFAULT_PROVIDER_IDS.ollama,
    id: 'ollama/nomic-embed-text',
    model: 'nomic-embed-text',
    dimension: 768,
  },
  {
    providerType: 'ollama',
    providerId: DEFAULT_PROVIDER_IDS.ollama,
    id: 'ollama/mxbai-embed-large',
    model: 'mxbai-embed-large',
    dimension: 1024,
  },
  {
    providerType: 'ollama',
    providerId: DEFAULT_PROVIDER_IDS.ollama,
    id: 'ollama/bge-m3',
    model: 'bge-m3',
    dimension: 1024,
  },
]
