import { parseSmartCopilotSettings } from './settings'

describe('parseSmartCopilotSettings', () => {
  it('should return default values for empty input', () => {
    const result = parseSmartCopilotSettings({})
    expect(result).toEqual({
      openAIApiKey: '',
      groqApiKey: '',
      anthropicApiKey: '',
      ollamaBaseUrl: '',
      chatModel: 'claude-3-5-sonnet-latest',
      applyModel: 'gpt-4o-mini',
      embeddingModel: 'text-embedding-3-small',
      systemPrompt: '',
      ragOptions: {
        chunkSize: 1000,
        thresholdTokens: 8192,
        minSimilarity: 0.0,
        limit: 10,
        excludePatterns: [],
      },
    })
  })
})
