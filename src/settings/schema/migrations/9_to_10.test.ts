import { DEFAULT_PROVIDERS_V10, migrateFrom9To10 } from './9_to_10'

describe('Migration from v9 to v10', () => {
  it('should use default providers if providers is not present', () => {
    const oldSettings = {
      version: 9,
    }
    const result = migrateFrom9To10(oldSettings)
    expect(result.version).toBe(10)
    expect(result.providers).toEqual(DEFAULT_PROVIDERS_V10)
  })

  it('should merge existing providers and add new default provider (mistral)', () => {
    const oldSettings = {
      version: 9,
      providers: [
        { type: 'openai', id: 'openai', apiKey: 'openai-key' },
        { type: 'anthropic', id: 'anthropic', apiKey: 'anthropic-key' },
        { type: 'gemini', id: 'gemini', apiKey: 'gemini-key' },
        { type: 'groq', id: 'groq', apiKey: 'groq-key' },
        { type: 'deepseek', id: 'deepseek', apiKey: 'deepseek-key' },
      ],
    }
    const result = migrateFrom9To10(oldSettings)
    expect(result.version).toBe(10)
    expect(result.providers).toEqual([
      { type: 'openai', id: 'openai', apiKey: 'openai-key' },
      { type: 'anthropic', id: 'anthropic', apiKey: 'anthropic-key' },
      { type: 'gemini', id: 'gemini', apiKey: 'gemini-key' },
      { type: 'deepseek', id: 'deepseek', apiKey: 'deepseek-key' },
      { type: 'perplexity', id: 'perplexity' },
      { type: 'groq', id: 'groq', apiKey: 'groq-key' },
      { type: 'mistral', id: 'mistral' },
      { type: 'openrouter', id: 'openrouter' },
      { type: 'ollama', id: 'ollama' },
      { type: 'lm-studio', id: 'lm-studio' },
      { type: 'morph', id: 'morph' },
    ])
  })

  it('should add default providers and preserve custom providers', () => {
    const oldSettings = {
      version: 9,
      providers: [
        ...DEFAULT_PROVIDERS_V10.filter((p) => p.id !== 'mistral'),
        {
          type: 'openai-compatible',
          id: 'cohere',
          baseUrl: 'https://api.cohere.ai',
          apiKey: 'cohere-api-key',
          additionalSettings: { noStainless: true },
        },
      ],
    }
    const result = migrateFrom9To10(oldSettings)
    expect(result.version).toBe(10)
    expect(result.providers).toEqual([
      ...DEFAULT_PROVIDERS_V10,
      {
        type: 'openai-compatible',
        id: 'cohere',
        baseUrl: 'https://api.cohere.ai',
        apiKey: 'cohere-api-key',
        additionalSettings: { noStainless: true },
      },
    ])
  })

  it('should preserve custom fields on existing default providers', () => {
    const oldSettings = {
      version: 9,
      providers: [
        {
          type: 'openai',
          id: 'openai',
          apiKey: 'openai-key',
          customField: 'foo',
        },
        {
          type: 'mistral',
          id: 'mistral',
          apiKey: 'mistral-key',
          customField: 'bar',
        },
      ],
    }
    const result = migrateFrom9To10(oldSettings)
    expect(result.version).toBe(10)
    expect(result.providers).toEqual([
      {
        type: 'openai',
        id: 'openai',
        apiKey: 'openai-key',
        customField: 'foo',
      },
      { type: 'anthropic', id: 'anthropic' },
      { type: 'gemini', id: 'gemini' },
      { type: 'deepseek', id: 'deepseek' },
      { type: 'perplexity', id: 'perplexity' },
      { type: 'groq', id: 'groq' },
      {
        type: 'mistral',
        id: 'mistral',
        apiKey: 'mistral-key',
        customField: 'bar',
      },
      { type: 'openrouter', id: 'openrouter' },
      { type: 'ollama', id: 'ollama' },
      { type: 'lm-studio', id: 'lm-studio' },
      { type: 'morph', id: 'morph' },
    ])
  })

  it('should handle a custom provider with id "mistral" and type "openai-compatible"', () => {
    const oldSettings = {
      version: 9,
      providers: [
        {
          type: 'openai-compatible',
          id: 'mistral',
          baseUrl: 'https://custom-mistral-endpoint',
          apiKey: 'custom-mistral-key',
          customField: 'custom',
        },
      ],
    }
    const result = migrateFrom9To10(oldSettings)
    expect(result.version).toBe(10)
    expect(result.providers).toEqual(DEFAULT_PROVIDERS_V10)
  })
})
