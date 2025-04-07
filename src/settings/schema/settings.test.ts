import {
  DEFAULT_CHAT_MODELS,
  DEFAULT_EMBEDDING_MODELS,
  DEFAULT_PROVIDERS,
} from '../../constants'
import { AssistantLevel } from '../../types/assistant-level.types'

import { SETTINGS_SCHEMA_VERSION } from './migrations'
import { parseSmartComposerSettings } from './settings'

describe('parseSmartComposerSettings', () => {
  it('should return default values for empty input', () => {
    const result = parseSmartComposerSettings({})
    expect(result).toEqual({
      version: SETTINGS_SCHEMA_VERSION,

      providers: [...DEFAULT_PROVIDERS],

      chatModels: [...DEFAULT_CHAT_MODELS],
      embeddingModels: [...DEFAULT_EMBEDDING_MODELS],

      chatModelId: 'claude-3.7-sonnet',
      applyModelId: 'gpt-4o-mini',
      embeddingModelId: 'openai/text-embedding-3-small',
      assistantLevel: AssistantLevel.WithReferencingAndEdit,

      systemPrompt: '',

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
