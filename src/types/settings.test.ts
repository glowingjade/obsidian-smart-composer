import { SETTINGS_SCHEMA_VERSION, parseSmartCopilotSettings } from './settings'

describe('parseSmartCopilotSettings', () => {
  it('should return default values for empty input', () => {
    const result = parseSmartCopilotSettings({})
    expect(result).toEqual({
      version: SETTINGS_SCHEMA_VERSION,

      openAIApiKey: '',
      anthropicApiKey: '',
      groqApiKey: '',

      chatModelId: 'anthropic/claude-3.5-sonnet-latest',
      ollamaChatModel: {
        baseUrl: '',
        model: '',
      },
      openAICompatibleChatModel: {
        baseUrl: '',
        apiKey: '',
        model: '',
      },

      applyModelId: 'openai/gpt-4o-mini',
      ollamaApplyModel: {
        baseUrl: '',
        model: '',
      },
      openAICompatibleApplyModel: {
        baseUrl: '',
        apiKey: '',
        model: '',
      },

      embeddingModelId: 'openai/text-embedding-3-small',
      ollamaEmbeddingModel: {
        baseUrl: '',
        model: '',
      },

      systemPrompt: '',
      ragOptions: {
        chunkSize: 1000,
        thresholdTokens: 8192,
        minSimilarity: 0.0,
        limit: 10,
      },
    })
  })
})
