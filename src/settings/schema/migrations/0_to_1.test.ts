import { migrateFrom0To1 } from './0_to_1'

describe('settings 0_to_1 migration', () => {
  it('should migrate from v0 to v1', () => {
    const oldSettings = {
      openAIApiKey: 'openai-api-key',
      groqApiKey: 'groq-api-key',
      anthropicApiKey: 'anthropic-api-key',
      ollamaBaseUrl: 'http://localhost:11434',
      chatModel: 'claude-3.5-sonnet-latest',
      applyModel: 'gpt-4o-mini',
      embeddingModel: 'text-embedding-3-small',
      systemPrompt: 'system prompt',
      ragOptions: {
        chunkSize: 1000,
        thresholdTokens: 8192,
        minSimilarity: 0.0,
        limit: 10,
      },
    }

    const result = migrateFrom0To1(oldSettings)
    expect(result).toEqual({
      version: 1,

      openAIApiKey: 'openai-api-key',
      anthropicApiKey: 'anthropic-api-key',
      geminiApiKey: '',
      groqApiKey: 'groq-api-key',

      chatModelId: 'anthropic/claude-3.5-sonnet-latest',
      ollamaChatModel: {
        baseUrl: 'http://localhost:11434',
        model: '',
      },
      openAICompatibleChatModel: {
        baseUrl: '',
        apiKey: '',
        model: '',
      },

      applyModelId: 'openai/gpt-4o-mini',
      ollamaApplyModel: {
        baseUrl: 'http://localhost:11434',
        model: '',
      },
      openAICompatibleApplyModel: {
        baseUrl: '',
        apiKey: '',
        model: '',
      },

      embeddingModelId: 'openai/text-embedding-3-small',
      ollamaEmbeddingModel: {
        baseUrl: 'http://localhost:11434',
        model: '',
      },

      systemPrompt: 'system prompt',
      ragOptions: {
        chunkSize: 1000,
        thresholdTokens: 8192,
        minSimilarity: 0.0,
        limit: 10,
        excludePatterns: [],
        includePatterns: [],
      },
    })
  })
})
