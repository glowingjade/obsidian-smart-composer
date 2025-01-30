import { DEFAULT_CHAT_MODELS } from '../../../types/chat-model.types'
import { DEFAULT_EMBEDDING_MODELS } from '../../../types/embedding-model.types'

import { migrateFrom1To2 } from './1_to_2'

// TODO: should add tests more thoroughly

describe('settings 1_to_2 migration', () => {
  it('should migrate from v1 to v2', () => {
    const oldSettings = {
      version: 1,

      openAIApiKey: 'openai-api-key',
      anthropicApiKey: 'anthropic-api-key',
      geminiApiKey: 'gemini-api-key',
      groqApiKey: 'groq-api-key',

      chatModelId: 'anthropic/claude-3.5-sonnet-latest',
      ollamaChatModel: {
        baseUrl: 'http://127.0.0.1:11434',
        model: 'custom-ollama-model',
      },
      openAICompatibleChatModel: {
        baseUrl: 'https://custom-openai-compatible-base-url',
        apiKey: 'custom-openai-compatible-key',
        model: 'custom-openai-compatible-model',
      },

      applyModelId: 'openai/gpt-4o-mini',
      ollamaApplyModel: {
        baseUrl: 'http://127.0.0.1:11434',
        model: 'custom-ollama-model',
      },
      openAICompatibleApplyModel: {
        baseUrl: 'https://custom-openai-compatible-base-url',
        apiKey: 'custom-openai-compatible-key',
        model: 'custom-openai-compatible-model',
      },

      embeddingModelId: 'ollama/nomic-embed-text',
      ollamaEmbeddingModel: {
        baseUrl: 'http://127.0.0.1:11434',
        model: 'ollama/nomic-embed-text',
      },

      systemPrompt: 'You are a helpful assistant',
      ragOptions: {
        chunkSize: 1000,
        thresholdTokens: 8192,
        minSimilarity: 0,
        limit: 10,
        excludePatterns: ['exclude/**'],
        includePatterns: ['include/**'],
      },
    }

    const result = migrateFrom1To2(oldSettings)
    expect(result).toEqual({
      version: 2,

      providers: [
        {
          type: 'openai',
          id: 'openai',
          apiKey: 'openai-api-key',
        },
        {
          type: 'anthropic',
          id: 'anthropic',
          apiKey: 'anthropic-api-key',
        },
        {
          type: 'gemini',
          id: 'gemini',
          apiKey: 'gemini-api-key',
        },
        {
          type: 'groq',
          id: 'groq',
          apiKey: 'groq-api-key',
        },
        {
          type: 'ollama',
          id: 'ollama',
          baseURL: 'http://localhost:11434',
        },
        {
          type: 'openai-compatible',
          id: 'custom-1',
          baseURL: 'https://custom-openai-compatible-base-url',
          apiKey: 'custom-openai-compatible-key',
        },
      ],

      chatModels: [
        ...DEFAULT_CHAT_MODELS,
        {
          providerType: 'ollama',
          providerId: 'ollama',
          id: 'ollama/custom-ollama-model',
          model: 'custom-ollama-model',
        },
        {
          providerType: 'openai-compatible',
          providerId: 'custom-1',
          id: 'custom-1/custom-openai-compatible-model',
          model: 'custom-openai-compatible-model',
        },
      ],

      embeddingModels: DEFAULT_EMBEDDING_MODELS,

      chatModelId: 'claude-3.5-sonnet',
      applyModelId: 'gpt-4o-mini',
      embeddingModelId: 'ollama/nomic-embed-text',

      systemPrompt: 'You are a helpful assistant',
      ragOptions: {
        chunkSize: 1000,
        thresholdTokens: 8192,
        minSimilarity: 0.0,
        limit: 10,
        excludePatterns: ['exclude/**'],
        includePatterns: ['include/**'],
      },
    })
  })

  it('should handle minimal v1 settings', () => {
    const oldSettings = {
      version: 1,

      openAIApiKey: '',
      anthropicApiKey: '',
      geminiApiKey: '',
      groqApiKey: '',

      chatModelId: 'anthropic/claude-3.5-sonnet-latest',
      ollamaChatModel: { baseUrl: '', model: '' },
      openAICompatibleChatModel: { baseUrl: '', apiKey: '', model: '' },

      applyModelId: 'openai/gpt-4o-mini',
      ollamaApplyModel: { baseUrl: '', model: '' },
      openAICompatibleApplyModel: { baseUrl: '', apiKey: '', model: '' },

      embeddingModelId: 'openai/text-embedding-3-small',
      ollamaEmbeddingModel: { baseUrl: '', model: '' },

      systemPrompt: '',
      ragOptions: {
        chunkSize: 1000,
        thresholdTokens: 8192,
        minSimilarity: 0,
        limit: 10,
        excludePatterns: [],
        includePatterns: [],
      },
    }

    const result = migrateFrom1To2(oldSettings)
    expect(result).toEqual({
      version: 2,

      providers: [
        { type: 'openai', id: 'openai', apiKey: '' },
        { type: 'anthropic', id: 'anthropic', apiKey: '' },
        { type: 'gemini', id: 'gemini', apiKey: '' },
        { type: 'groq', id: 'groq', apiKey: '' },
        { type: 'ollama', id: 'ollama', baseURL: '' },
      ],

      chatModels: DEFAULT_CHAT_MODELS,

      chatModelId: 'claude-3.5-sonnet',
      applyModelId: 'gpt-4o-mini',
      embeddingModelId: 'openai/text-embedding-3-small',

      systemPrompt: '',
      ragOptions: {
        chunkSize: 1000,
        thresholdTokens: 8192,
        minSimilarity: 0,
        limit: 10,
        excludePatterns: [],
        includePatterns: [],
      },
    })
  })

  it('should migrate ollama chat, apply, and embedding models with distinct baseUrls', () => {
    const oldSettings = {
      version: 1,
      openAIApiKey: '',
      anthropicApiKey: '',
      geminiApiKey: '',
      groqApiKey: '',

      chatModelId: 'ollama',
      ollamaChatModel: {
        baseUrl: 'http://local-chat:11434',
        model: 'ollama-chat',
      },
      openAICompatibleChatModel: { baseUrl: '', apiKey: '', model: '' },

      applyModelId: 'ollama',
      ollamaApplyModel: {
        baseUrl: 'http://local-apply:11434',
        model: 'ollama-apply',
      },
      openAICompatibleApplyModel: { baseUrl: '', apiKey: '', model: '' },

      embeddingModelId: 'ollama/nomic-embed-text',
      ollamaEmbeddingModel: {
        baseUrl: 'http://local-embed:11434',
        model: 'nomic-embed-text',
      },

      systemPrompt: 'You are using Ollama for everything!',
      ragOptions: {
        chunkSize: 500,
        thresholdTokens: 4000,
        minSimilarity: 0.5,
        limit: 5,
        excludePatterns: ['ignore/**'],
        includePatterns: ['docs/**'],
      },
    }

    const result = migrateFrom1To2(oldSettings)

    expect(result).toEqual({
      version: 2,

      providers: [
        { type: 'openai', id: 'openai', apiKey: '' },
        { type: 'anthropic', id: 'anthropic', apiKey: '' },
        { type: 'gemini', id: 'gemini', apiKey: '' },
        { type: 'groq', id: 'groq', apiKey: '' },
        { type: 'ollama', id: 'ollama', baseURL: 'http://local-chat:11434' },
        { type: 'ollama', id: 'ollama-1', baseURL: 'http://local-apply:11434' },
        { type: 'ollama', id: 'ollama-2', baseURL: 'http://local-embed:11434' },
      ],

      chatModels: [
        ...DEFAULT_CHAT_MODELS,
        {
          providerType: 'ollama',
          providerId: 'ollama',
          id: 'ollama/ollama-chat',
          model: 'ollama-chat',
        },
        {
          providerType: 'ollama',
          providerId: 'ollama-1',
          id: 'ollama-1/ollama-apply',
          model: 'ollama-apply',
        },
      ],

      embeddingModels: [
        ...DEFAULT_EMBEDDING_MODELS,
        {
          providerType: 'ollama',
          providerId: 'ollama-2',
          id: 'ollama-2/nomic-embed-text',
          model: 'nomic-embed-text',
          dimension: 768,
        },
      ],

      chatModelId: 'ollama/ollama-chat',
      applyModelId: 'ollama/ollama-apply',
      embeddingModelId: 'ollama-2/nomic-embed-text',

      systemPrompt: 'You are using Ollama for everything!',
      ragOptions: {
        chunkSize: 500,
        thresholdTokens: 4000,
        minSimilarity: 0.5,
        limit: 5,
        excludePatterns: ['ignore/**'],
        includePatterns: ['docs/**'],
      },
    })
  })

  it('should migrate openai-compatible chat, apply, and embedding models with distinct baseUrls and apiKeys', () => {
    const oldSettings = {
      version: 1,
      openAIApiKey: '',
      anthropicApiKey: '',
      geminiApiKey: '',
      groqApiKey: '',

      chatModelId: 'openai-compatible',
      ollamaChatModel: { baseUrl: '', model: '' },
      openAICompatibleChatModel: {
        baseUrl: 'https://custom-chat-endpoint',
        apiKey: 'CUSTOM_CHAT_KEY',
        model: 'custom-chat-model',
      },

      applyModelId: 'openai-compatible',
      ollamaApplyModel: { baseUrl: '', model: '' },
      openAICompatibleApplyModel: {
        baseUrl: 'https://custom-apply-endpoint',
        apiKey: 'CUSTOM_APPLY_KEY',
        model: 'custom-apply-model',
      },

      embeddingModelId: 'openai/text-embedding-3-small',
      ollamaEmbeddingModel: { baseUrl: '', model: '' },

      systemPrompt: 'OpenAI compatible test',
      ragOptions: {
        chunkSize: 100,
        thresholdTokens: 512,
        minSimilarity: 0.1,
        limit: 3,
        excludePatterns: ['tmp/**'],
        includePatterns: [],
      },
    }

    const result = migrateFrom1To2(oldSettings)

    // Example expectations; actual providers & IDs may differ based on your migration
    expect(result).toEqual({
      version: 2,

      providers: [
        { type: 'openai', id: 'openai', apiKey: '' },
        { type: 'anthropic', id: 'anthropic', apiKey: '' },
        { type: 'gemini', id: 'gemini', apiKey: '' },
        { type: 'groq', id: 'groq', apiKey: '' },
        { type: 'ollama', id: 'ollama', baseURL: '' },
        {
          type: 'openai-compatible',
          id: 'custom-1',
          baseURL: 'https://custom-chat-endpoint',
          apiKey: 'CUSTOM_CHAT_KEY',
        },
        {
          type: 'openai-compatible',
          id: 'custom-2',
          baseURL: 'https://custom-apply-endpoint',
          apiKey: 'CUSTOM_APPLY_KEY',
        },
      ],

      chatModels: [
        ...DEFAULT_CHAT_MODELS,
        {
          providerType: 'openai-compatible',
          providerId: 'custom-1',
          id: 'custom-1/custom-chat-model',
          model: 'custom-chat-model',
        },
        {
          providerType: 'openai-compatible',
          providerId: 'custom-2',
          id: 'custom-2/custom-apply-model',
          model: 'custom-apply-model',
        },
      ],

      embeddingModels: DEFAULT_EMBEDDING_MODELS,

      chatModelId: 'custom-1/custom-chat-model',
      applyModelId: 'custom-2/custom-apply-model',
      embeddingModelId: 'openai/text-embedding-3-small',

      systemPrompt: 'OpenAI compatible test',
      ragOptions: {
        chunkSize: 100,
        thresholdTokens: 512,
        minSimilarity: 0.1,
        limit: 3,
        excludePatterns: ['tmp/**'],
        includePatterns: [],
      },
    })
  })
})
