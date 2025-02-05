import { SettingMigration } from '../setting.types'

export const migrateFrom0To1: SettingMigration['migrate'] = (data) => {
  const newData = { ...data }

  if ('chatModel' in newData && typeof newData.chatModel === 'string') {
    const CHAT_MODEL_MAP: Record<string, string> = {
      'claude-3.5-sonnet-latest': 'anthropic/claude-3.5-sonnet-latest',
      'gpt-4o': 'openai/gpt-4o',
      'gpt-4o-mini': 'openai/gpt-4o-mini',
      'llama-3.1-70b-versatile': 'groq/llama-3.1-70b-versatile',
      'llama3.1:8b': 'ollama',
    }
    newData.chatModelId =
      CHAT_MODEL_MAP[newData.chatModel] ?? 'anthropic/claude-3.5-sonnet-latest'
    delete newData.chatModel
  }
  if ('applyModel' in newData && typeof newData.applyModel === 'string') {
    const APPLY_MODEL_MAP: Record<string, string> = {
      'gpt-4o-mini': 'openai/gpt-4o-mini',
      'llama-3.1-8b-instant': 'groq/llama-3.1-8b-instant',
      'llama-3.1-70b-versatile': 'groq/llama-3.1-70b-versatile',
      'llama3.1:8b': 'ollama',
    }
    newData.applyModelId =
      APPLY_MODEL_MAP[newData.applyModel] ?? 'openai/gpt-4o-mini'
    delete newData.applyModel
  }
  if (
    'embeddingModel' in newData &&
    typeof newData.embeddingModel === 'string'
  ) {
    const EMBEDDING_MODEL_MAP: Record<string, string> = {
      'text-embedding-3-small': 'openai/text-embedding-3-small',
      'text-embedding-3-large': 'openai/text-embedding-3-large',
      'nomic-embed-text': 'ollama/nomic-embed-text',
      'mxbai-embed-large': 'ollama/mxbai-embed-large',
      'bge-m3': 'ollama/bge-m3',
    }
    newData.embeddingModelId =
      EMBEDDING_MODEL_MAP[newData.embeddingModel] ??
      'openai/text-embedding-3-small'
    delete newData.embeddingModel
  }
  if ('ollamaBaseUrl' in newData && typeof newData.ollamaBaseUrl === 'string') {
    newData.ollamaChatModel = {
      baseUrl: newData.ollamaBaseUrl,
      model: '',
    }
    newData.ollamaApplyModel = {
      baseUrl: newData.ollamaBaseUrl,
      model: '',
    }
    newData.ollamaEmbeddingModel = {
      baseUrl: newData.ollamaBaseUrl,
      model: '',
    }
    delete newData.ollamaBaseUrl
  }

  newData.geminiApiKey = ''
  newData.version = 1
  newData.openAICompatibleChatModel = {
    baseUrl: '',
    apiKey: '',
    model: '',
  }
  newData.openAICompatibleApplyModel = {
    baseUrl: '',
    apiKey: '',
    model: '',
  }

  if (
    'ragOptions' in newData &&
    typeof newData.ragOptions === 'object' &&
    newData.ragOptions !== null
  ) {
    newData.ragOptions = {
      ...newData.ragOptions,
      excludePatterns: [],
      includePatterns: [],
    }
  }

  return newData
}
