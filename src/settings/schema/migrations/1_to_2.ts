import { z } from 'zod'

import { ChatModel } from '../../../types/chat-model.types'
import { EmbeddingModel } from '../../../types/embedding-model.types'
import { LLMProvider, LLMProviderType } from '../../../types/provider.types'
import { SettingMigration, SmartComposerSettings } from '../setting.types'

type NativeLLMModel = {
  provider: 'openai' | 'anthropic' | 'gemini' | 'groq'
  model: string
  supportsStreaming?: boolean
}

type OllamaModel = {
  provider: 'ollama'
  baseURL: string
  model: string
  supportsStreaming?: boolean
}

type OpenAICompatibleModel = {
  provider: 'openai-compatible'
  apiKey: string
  baseURL: string
  model: string
  supportsStreaming?: boolean
}

type LLMModel = NativeLLMModel | OllamaModel | OpenAICompatibleModel

type ModelOption = {
  id: string
  name: string
  model: LLMModel
}

type EmbeddingModelId =
  | 'openai/text-embedding-3-small'
  | 'openai/text-embedding-3-large'
  | 'gemini/text-embedding-004'
  | 'ollama/nomic-embed-text'
  | 'ollama/mxbai-embed-large'
  | 'ollama/bge-m3'

type EmbeddingModelOption = {
  id: EmbeddingModelId
  name: string
  model: LLMModel
  dimension: number
}

const CHAT_MODEL_OPTIONS: ModelOption[] = [
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
    id: 'gemini/gemini-2.0-flash-thinking',
    name: 'gemini-2.0-flash-thinking',
    model: {
      provider: 'gemini',
      model: 'gemini-2.0-flash-thinking-exp',
    },
  },
  {
    id: 'gemini/gemini-exp-1206',
    name: 'gemini-exp-1206',
    model: {
      provider: 'gemini',
      model: 'gemini-exp-1206',
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
  {
    id: 'openai/o1',
    name: 'OpenAI o1 (Non-Streaming)',
    model: {
      provider: 'openai',
      model: 'o1',
      supportsStreaming: false,
    },
  },
]

const APPLY_MODEL_OPTIONS: ModelOption[] = [
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

const EMBEDDING_MODEL_OPTIONS: EmbeddingModelOption[] = [
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
    id: 'ollama/nomic-embed-text',
    name: 'ollama/nomic-embed-text',
    model: {
      provider: 'ollama',
      model: 'nomic-embed-text',
      baseURL: '',
    },
    dimension: 768,
  },
  {
    id: 'ollama/mxbai-embed-large',
    name: 'ollama/mxbai-embed-large',
    model: {
      provider: 'ollama',
      model: 'mxbai-embed-large',
      baseURL: '',
    },
    dimension: 1024,
  },
  {
    id: 'ollama/bge-m3',
    name: 'ollama/bge-m3',
    model: {
      provider: 'ollama',
      model: 'bge-m3',
      baseURL: '',
    },
    dimension: 1024,
  },
]

const SETTINGS_SCHEMA_VERSION = 1

const ollamaModelSchema = z.object({
  baseUrl: z.string().catch(''),
  model: z.string().catch(''),
})
const openAICompatibleModelSchema = z.object({
  baseUrl: z.string().catch(''),
  apiKey: z.string().catch(''),
  model: z.string().catch(''),
})
const chatModelIdSchema = z.enum(
  CHAT_MODEL_OPTIONS.map((opt) => opt.id) as [string, ...string[]],
)
const applyModelIdSchema = z.enum(
  APPLY_MODEL_OPTIONS.map((opt) => opt.id) as [string, ...string[]],
)
const embeddingModelIdSchema = z.enum(
  EMBEDDING_MODEL_OPTIONS.map((opt) => opt.id) as [string, ...string[]],
)
const ragOptionsSchema = z.object({
  chunkSize: z.number().catch(1000),
  thresholdTokens: z.number().catch(8192),
  minSimilarity: z.number().catch(0.0),
  limit: z.number().catch(10),
  excludePatterns: z.array(z.string()).catch([]),
  includePatterns: z.array(z.string()).catch([]),
})
const smartComposerSettingsSchemaV1 = z.object({
  // Version
  version: z.literal(SETTINGS_SCHEMA_VERSION).catch(SETTINGS_SCHEMA_VERSION),

  // API Keys
  openAIApiKey: z.string().catch(''),
  anthropicApiKey: z.string().catch(''),
  geminiApiKey: z.string().catch(''),
  groqApiKey: z.string().catch(''),

  // Chat Models
  chatModelId: chatModelIdSchema.catch('anthropic/claude-3.5-sonnet-latest'),
  ollamaChatModel: ollamaModelSchema.catch({
    baseUrl: '',
    model: '',
  }),
  openAICompatibleChatModel: openAICompatibleModelSchema.catch({
    baseUrl: '',
    apiKey: '',
    model: '',
  }),

  // Apply Models
  applyModelId: applyModelIdSchema.catch('openai/gpt-4o-mini'),
  ollamaApplyModel: ollamaModelSchema.catch({
    baseUrl: '',
    model: '',
  }),
  openAICompatibleApplyModel: openAICompatibleModelSchema.catch({
    baseUrl: '',
    apiKey: '',
    model: '',
  }),

  // Embedding Models
  embeddingModelId: embeddingModelIdSchema.catch(
    'openai/text-embedding-3-small',
  ),
  ollamaEmbeddingModel: ollamaModelSchema.catch({
    baseUrl: '',
    model: '',
  }),

  // System Prompt
  systemPrompt: z.string().catch(''),

  // RAG Options
  ragOptions: ragOptionsSchema.catch({
    chunkSize: 1000,
    thresholdTokens: 8192,
    minSimilarity: 0.0,
    limit: 10,
    excludePatterns: [],
    includePatterns: [],
  }),
})
type SmartComposerSettingsV1 = z.infer<typeof smartComposerSettingsSchemaV1>

/**
 * V2 constants
 */

export const V2_PROVIDER_TYPES_INFO = {
  openai: {
    label: 'OpenAI',
    defaultProviderId: 'openai',
    requireBaseUrl: false,
    supportEmbedding: true,
  },
  anthropic: {
    label: 'Anthropic',
    defaultProviderId: 'anthropic',
    requireBaseUrl: false,
    supportEmbedding: false,
  },
  gemini: {
    label: 'Gemini',
    defaultProviderId: 'gemini',
    requireBaseUrl: false,
    supportEmbedding: true,
  },
  groq: {
    label: 'Groq',
    defaultProviderId: 'groq',
    requireBaseUrl: false,
    supportEmbedding: false,
  },
  openrouter: {
    label: 'OpenRouter',
    defaultProviderId: 'openrouter',
    requireBaseUrl: false,
    supportEmbedding: false,
  },
  ollama: {
    label: 'Ollama',
    defaultProviderId: 'ollama',
    requireBaseUrl: false,
    supportEmbedding: true,
  },
  'lm-studio': {
    label: 'LM Studio',
    defaultProviderId: null,
    requireBaseUrl: false,
    supportEmbedding: true,
  },
  deepseek: {
    label: 'DeepSeek',
    defaultProviderId: null,
    requireBaseUrl: false,
    supportEmbedding: true,
  },
  'azure-openai': {
    label: 'Azure OpenAI',
    defaultProviderId: null, // no default provider for this type
    requireBaseUrl: true,
    supportEmbedding: false,
  },
  'openai-compatible': {
    label: 'OpenAI Compatible',
    defaultProviderId: null, // no default provider for this type
    requireBaseUrl: true,
    supportEmbedding: false,
  },
} as const satisfies Record<
  LLMProviderType,
  {
    label: string
    defaultProviderId: string | null
    requireBaseUrl: boolean
    supportEmbedding: boolean
  }
>

export const V2_DEFAULT_PROVIDERS: readonly LLMProvider[] = [
  {
    type: 'openai',
    id: V2_PROVIDER_TYPES_INFO.openai.defaultProviderId,
  },
  {
    type: 'anthropic',
    id: V2_PROVIDER_TYPES_INFO.anthropic.defaultProviderId,
  },
  {
    type: 'gemini',
    id: V2_PROVIDER_TYPES_INFO.gemini.defaultProviderId,
  },
  {
    type: 'groq',
    id: V2_PROVIDER_TYPES_INFO.groq.defaultProviderId,
  },
  {
    type: 'openrouter',
    id: V2_PROVIDER_TYPES_INFO.openrouter.defaultProviderId,
  },
  {
    type: 'ollama',
    id: V2_PROVIDER_TYPES_INFO.ollama.defaultProviderId,
  },
]

export const V2_DEFAULT_CHAT_MODELS: readonly ChatModel[] = [
  {
    providerType: 'anthropic',
    providerId: V2_PROVIDER_TYPES_INFO.anthropic.defaultProviderId,
    id: 'claude-3.5-sonnet',
    model: 'claude-3-5-sonnet-latest',
  },
  {
    providerType: 'openai',
    providerId: V2_PROVIDER_TYPES_INFO.openai.defaultProviderId,
    id: 'gpt-4o',
    model: 'gpt-4o',
  },
  {
    providerType: 'openai',
    providerId: V2_PROVIDER_TYPES_INFO.openai.defaultProviderId,
    id: 'gpt-4o-mini',
    model: 'gpt-4o-mini',
  },
  {
    providerType: 'gemini',
    providerId: V2_PROVIDER_TYPES_INFO.gemini.defaultProviderId,
    id: 'gemini-1.5-pro',
    model: 'gemini-1.5-pro',
  },
  {
    providerType: 'gemini',
    providerId: V2_PROVIDER_TYPES_INFO.gemini.defaultProviderId,
    id: 'gemini-2.0-flash',
    model: 'gemini-2.0-flash-exp',
  },
  {
    providerType: 'gemini',
    providerId: V2_PROVIDER_TYPES_INFO.gemini.defaultProviderId,
    id: 'gemini-2.0-flash-thinking',
    model: 'gemini-2.0-flash-thinking-exp',
  },
  {
    providerType: 'gemini',
    providerId: V2_PROVIDER_TYPES_INFO.gemini.defaultProviderId,
    id: 'gemini-exp-1206',
    model: 'gemini-exp-1206',
  },
  {
    providerType: 'groq',
    providerId: V2_PROVIDER_TYPES_INFO.groq.defaultProviderId,
    id: 'groq/llama-3.1-70b',
    model: 'llama-3.1-70b-versatile',
  },
  {
    providerType: 'openai',
    providerId: V2_PROVIDER_TYPES_INFO.openai.defaultProviderId,
    id: 'o1',
    model: 'o1',
    streamingDisabled: true, // currently, o1 API doesn't support streaming
  },
  {
    providerType: 'anthropic',
    providerId: V2_PROVIDER_TYPES_INFO.anthropic.defaultProviderId,
    id: 'claude-3.5-haiku',
    model: 'claude-3-5-haiku-latest',
  },
  {
    providerType: 'gemini',
    providerId: V2_PROVIDER_TYPES_INFO.gemini.defaultProviderId,
    id: 'gemini-1.5-flash',
    model: 'gemini-1.5-flash',
  },
  {
    providerType: 'groq',
    providerId: V2_PROVIDER_TYPES_INFO.groq.defaultProviderId,
    id: 'groq/llama-3.1-8b',
    model: 'llama-3.1-8b-instant',
  },
]

export const V2_DEFAULT_EMBEDDING_MODELS: readonly EmbeddingModel[] = [
  {
    providerType: 'openai',
    providerId: V2_PROVIDER_TYPES_INFO.openai.defaultProviderId,
    id: 'openai/text-embedding-3-small',
    model: 'text-embedding-3-small',
    dimension: 1536,
  },
  {
    providerType: 'openai',
    providerId: V2_PROVIDER_TYPES_INFO.openai.defaultProviderId,
    id: 'openai/text-embedding-3-large',
    model: 'text-embedding-3-large',
    dimension: 3072,
  },
  {
    providerType: 'gemini',
    providerId: V2_PROVIDER_TYPES_INFO.gemini.defaultProviderId,
    id: 'gemini/text-embedding-004',
    model: 'text-embedding-004',
    dimension: 768,
  },
  {
    providerType: 'ollama',
    providerId: V2_PROVIDER_TYPES_INFO.ollama.defaultProviderId,
    id: 'ollama/nomic-embed-text',
    model: 'nomic-embed-text',
    dimension: 768,
  },
  {
    providerType: 'ollama',
    providerId: V2_PROVIDER_TYPES_INFO.ollama.defaultProviderId,
    id: 'ollama/mxbai-embed-large',
    model: 'mxbai-embed-large',
    dimension: 1024,
  },
  {
    providerType: 'ollama',
    providerId: V2_PROVIDER_TYPES_INFO.ollama.defaultProviderId,
    id: 'ollama/bge-m3',
    model: 'bge-m3',
    dimension: 1024,
  },
]

export const migrateFrom1To2: SettingMigration['migrate'] = (
  data: SmartComposerSettingsV1,
): SmartComposerSettings => {
  const providers: LLMProvider[] = [...V2_DEFAULT_PROVIDERS]
  const chatModels: ChatModel[] = [...V2_DEFAULT_CHAT_MODELS]

  // Map old model IDs to new model IDs
  const MODEL_ID_MAP: Record<string, string> = {
    // Anthropic models
    'anthropic/claude-3.5-sonnet-latest': 'claude-3.5-sonnet',
    'anthropic/claude-3.5-haiku': 'claude-3.5-haiku',

    // OpenAI models
    'openai/gpt-4o': 'gpt-4o',
    'openai/gpt-4o-mini': 'gpt-4o-mini',
    'openai/o1': 'o1',

    // Gemini models
    'gemini/gemini-1.5-pro': 'gemini-1.5-pro',
    'gemini/gemini-2.0-flash': 'gemini-2.0-flash',
    'gemini/gemini-2.0-flash-thinking': 'gemini-2.0-flash-thinking',
    'gemini/gemini-exp-1206': 'gemini-exp-1206',
    'gemini/gemini-1.5-flash': 'gemini-1.5-flash',

    // Groq models
    'groq/llama-3.1-70b-versatile': 'gpt-4o', // fallback to gpt-4o because groq/llama-3.1-70b is not in the default models
    'groq/llama-3.1-8b-instant': 'gpt-4o-mini', // fallback to gpt-4o-mini because groq/llama-3.1-8b is not in the default models
  }

  let chatModelId =
    MODEL_ID_MAP[data.chatModelId] ?? V2_DEFAULT_CHAT_MODELS[0].id
  let applyModelId =
    MODEL_ID_MAP[data.applyModelId] ??
    V2_DEFAULT_CHAT_MODELS.find((v) => v.id === 'gpt-4o-mini')?.id ??
    V2_DEFAULT_CHAT_MODELS[0].id

  /**
   * handle Ollama migration
   */
  let ollamaCustomProviderCount = 0
  const defaultOllamaBaseUrl =
    data.ollamaEmbeddingModel.baseUrl || // embedding model takes precedence
    data.ollamaChatModel.baseUrl ||
    data.ollamaApplyModel.baseUrl ||
    ''
  const ollamaProvider = providers.find((v) => v.type === 'ollama')
  if (ollamaProvider) {
    // ollamaProvider shouldn't be falsy, but just in case
    ollamaProvider.baseUrl = defaultOllamaBaseUrl
  }

  let ollamaChatProviderId
  if (
    data.ollamaChatModel.baseUrl &&
    data.ollamaChatModel.baseUrl !== defaultOllamaBaseUrl
  ) {
    ollamaChatProviderId = `ollama-${ollamaCustomProviderCount + 1}`
    providers.push({
      type: 'ollama',
      id: ollamaChatProviderId,
      baseUrl: data.ollamaChatModel.baseUrl,
    })
    ollamaCustomProviderCount += 1
  } else {
    ollamaChatProviderId = V2_PROVIDER_TYPES_INFO.ollama.defaultProviderId
  }
  if (data.ollamaChatModel.model) {
    const ollamaChatModelId = `${ollamaChatProviderId}/${data.ollamaChatModel.model}`
    chatModels.push({
      providerType: 'ollama',
      providerId: ollamaChatProviderId,
      id: ollamaChatModelId,
      model: data.ollamaChatModel.model,
    })
    if (data.chatModelId === 'ollama') {
      chatModelId = ollamaChatModelId
    }
  }

  const existingSameOllamaProviderForApplyModel = providers.find(
    (v) => v.type === 'ollama' && v.baseUrl === data.ollamaApplyModel.baseUrl,
  )

  let ollamaApplyProviderId
  if (
    !existingSameOllamaProviderForApplyModel &&
    data.ollamaApplyModel.baseUrl
  ) {
    ollamaApplyProviderId = `ollama-${ollamaCustomProviderCount + 1}`
    providers.push({
      type: 'ollama',
      id: ollamaApplyProviderId,
      baseUrl: data.ollamaApplyModel.baseUrl,
    })
    ollamaCustomProviderCount += 1
  } else {
    ollamaApplyProviderId =
      existingSameOllamaProviderForApplyModel?.id ??
      V2_PROVIDER_TYPES_INFO.ollama.defaultProviderId
  }
  if (data.ollamaApplyModel.model) {
    const existingSameChatModelForApplyModel = chatModels.find(
      (v) =>
        v.providerType === 'ollama' &&
        v.providerId === ollamaApplyProviderId &&
        v.model === data.ollamaApplyModel.model,
    )

    let ollamaApplyModelId
    if (existingSameChatModelForApplyModel) {
      ollamaApplyModelId = existingSameChatModelForApplyModel.id
    } else {
      ollamaApplyModelId = `${ollamaApplyProviderId}/${data.ollamaApplyModel.model}`
      chatModels.push({
        providerType: 'ollama',
        providerId: ollamaApplyProviderId,
        id: ollamaApplyModelId,
        model: data.ollamaApplyModel.model,
      })
    }
    if (data.applyModelId === 'ollama') {
      applyModelId = ollamaApplyModelId
    }
  }

  /**
   * handle OpenAI Compatible migration
   */
  let openAICompatibleCustomProviderCount = 0
  if (data.openAICompatibleChatModel.baseUrl) {
    const customProviderId = `custom-${openAICompatibleCustomProviderCount + 1}`
    providers.push({
      type: 'openai-compatible',
      id: customProviderId,
      baseUrl: data.openAICompatibleChatModel.baseUrl,
      apiKey: data.openAICompatibleChatModel.apiKey,
    })
    if (data.openAICompatibleChatModel.model) {
      const customChatModelId = `${customProviderId}/${data.openAICompatibleChatModel.model}`
      chatModels.push({
        providerType: 'openai-compatible',
        providerId: customProviderId,
        id: customChatModelId,
        model: data.openAICompatibleChatModel.model,
      })
      if (data.chatModelId === 'openai-compatible') {
        chatModelId = customChatModelId
      }
    }
    openAICompatibleCustomProviderCount += 1
  }
  if (data.openAICompatibleApplyModel.baseUrl) {
    const existingSameProvider = providers.find(
      (v) =>
        v.type === 'openai-compatible' &&
        v.baseUrl === data.openAICompatibleApplyModel.baseUrl &&
        v.apiKey === data.openAICompatibleApplyModel.apiKey,
    )

    let customProviderId
    if (existingSameProvider) {
      // if the same provider is already exists, don't create a new one
      customProviderId = existingSameProvider.id
    } else {
      customProviderId = `custom-${openAICompatibleCustomProviderCount + 1}`
      providers.push({
        type: 'openai-compatible',
        id: customProviderId,
        baseUrl: data.openAICompatibleApplyModel.baseUrl,
        apiKey: data.openAICompatibleApplyModel.apiKey,
      })
    }

    if (data.openAICompatibleApplyModel.model) {
      const existingSameChatModel = chatModels.find(
        (v) =>
          v.providerType === 'openai-compatible' &&
          v.providerId === customProviderId &&
          v.model === data.openAICompatibleApplyModel.model,
      )

      let customApplyModelId
      if (existingSameChatModel) {
        customApplyModelId = existingSameChatModel.id
      } else {
        customApplyModelId = `${customProviderId}/${data.openAICompatibleApplyModel.model}`
        chatModels.push({
          providerType: 'openai-compatible',
          providerId: customProviderId,
          id: customApplyModelId,
          model: data.openAICompatibleApplyModel.model,
        })
      }
      if (data.applyModelId === 'openai-compatible') {
        applyModelId = customApplyModelId
      }
    }
    openAICompatibleCustomProviderCount += 1
  }

  /**
   * Migrate API keys to providers
   */
  // Find and update each provider with their corresponding API key
  for (const provider of providers) {
    switch (provider.type) {
      case 'openai':
        if ('openAIApiKey' in data && typeof data.openAIApiKey === 'string') {
          provider.apiKey = data.openAIApiKey
        }
        break
      case 'anthropic':
        if (
          'anthropicApiKey' in data &&
          typeof data.anthropicApiKey === 'string'
        ) {
          provider.apiKey = data.anthropicApiKey
        }
        break
      case 'gemini':
        if ('geminiApiKey' in data && typeof data.geminiApiKey === 'string') {
          provider.apiKey = data.geminiApiKey
        }
        break
      case 'groq':
        if ('groqApiKey' in data && typeof data.groqApiKey === 'string') {
          provider.apiKey = data.groqApiKey
        }
        break
    }
  }

  return {
    version: 2,
    providers,
    chatModels,
    embeddingModels: [...V2_DEFAULT_EMBEDDING_MODELS],
    chatModelId,
    applyModelId,
    embeddingModelId: data.embeddingModelId,
    systemPrompt: data.systemPrompt,
    ragOptions: data.ragOptions,
  }
}
