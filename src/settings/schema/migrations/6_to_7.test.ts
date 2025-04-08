import {
  DEFAULT_CHAT_MODELS_V7,
  DEFAULT_PROVIDERS_V7,
  migrateFrom6To7,
} from './6_to_7'

describe('Migration from v6 to v7', () => {
  it('should use default providers if providers is not present', () => {
    const oldSettings = {
      version: 6,
    }
    const result = migrateFrom6To7(oldSettings)
    expect(result.providers).toEqual(DEFAULT_PROVIDERS_V7)
  })

  it('should reorder default providers', () => {
    const oldSettings = {
      version: 6,
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
          type: 'deepseek',
          id: 'deepseek',
          apiKey: 'deepseek-api-key',
        },
      ],
    }
    const result = migrateFrom6To7(oldSettings)
    expect(result.providers).toEqual([
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
        type: 'deepseek',
        id: 'deepseek',
        apiKey: 'deepseek-api-key',
      },
      {
        type: 'perplexity',
        id: 'perplexity',
      },
      {
        type: 'groq',
        id: 'groq',
        apiKey: 'groq-api-key',
      },
      {
        type: 'openrouter',
        id: 'openrouter',
      },
      {
        type: 'ollama',
        id: 'ollama',
      },
      {
        type: 'lm-studio',
        id: 'lm-studio',
      },
      {
        type: 'morph',
        id: 'morph',
      },
    ])
  })

  it('should add default providers and preserve custom providers', () => {
    const oldSettings = {
      version: 6,
      providers: [
        ...DEFAULT_PROVIDERS_V7.filter(
          (provider) => provider.id !== 'perplexity',
        ),
        {
          type: 'openai-compatible',
          id: 'cohere',
          baseUrl: 'https://api.cohere.ai',
          apiKey: 'cohere-api-key',
          additionalSettings: {
            noStainless: true,
          },
        },
      ],
    }
    const result = migrateFrom6To7(oldSettings)
    expect(result.providers).toEqual([
      ...DEFAULT_PROVIDERS_V7,
      {
        type: 'openai-compatible',
        id: 'cohere',
        baseUrl: 'https://api.cohere.ai',
        apiKey: 'cohere-api-key',
        additionalSettings: {
          noStainless: true,
        },
      },
    ])
  })

  it('should remove provider with id "perplexity"', () => {
    const oldSettings = {
      version: 6,
      providers: [
        {
          type: 'openai',
          id: 'openai',
        },
        {
          type: 'openai-compatible',
          id: 'perplexity',
          baseUrl: 'https://api.perplexity.ai',
          apiKey: 'perplexity-api-key',
        },
      ],
    }
    const result = migrateFrom6To7(oldSettings)
    expect(result.providers).toEqual(DEFAULT_PROVIDERS_V7)
  })

  it('should use default models if chatModels is not present', () => {
    const oldSettings = {
      version: 6,
    }
    const result = migrateFrom6To7(oldSettings)
    expect(result.version).toBe(7)
    expect(result.chatModels).toEqual(DEFAULT_CHAT_MODELS_V7)
  })

  it('should add default models and preserve custom models', () => {
    const oldSettings = {
      version: 6,
      chatModels: [
        {
          providerType: 'anthropic',
          providerId: 'anthropic',
          id: 'claude-3.7-sonnet',
          model: 'claude-3-7-sonnet-latest',
        },
        {
          providerType: 'openai-compatible',
          providerId: 'cohere',
          id: 'cohere-model',
          model: 'cohere-model',
          enable: false,
        },
      ],
    }
    const result = migrateFrom6To7(oldSettings)
    expect(result.chatModels).toEqual([
      ...DEFAULT_CHAT_MODELS_V7,
      {
        providerType: 'openai-compatible',
        providerId: 'cohere',
        id: 'cohere-model',
        model: 'cohere-model',
        enable: false,
      },
    ])
  })

  it('should replace models that are in the new default models', () => {
    const oldSettings = {
      version: 6,
      chatModels: [
        {
          providerType: 'anthropic',
          providerId: 'anthropic',
          id: 'claude-3.7-sonnet',
          model: 'claude-3-7-sonnet-latest',
        },
        {
          providerType: 'openai',
          providerId: 'openai',
          id: 'gpt-4o',
          model: 'gpt-4o',
          enable: false,
        },
        {
          providerType: 'deepseek',
          providerId: 'deepseek',
          id: 'deepseek-chat',
          model: 'deepseek-chat',
          enable: false,
        },
        {
          providerType: 'anthropic',
          providerId: 'anthropic',
          id: 'claude-3.7-sonnet-thinking',
          model: 'claude-3-7-sonnet-latest',
          thinking: {
            budget_tokens: 8192,
          },
        },
        {
          providerType: 'gemini',
          providerId: 'gemini',
          id: 'gemini-exp-1206',
          model: 'gemini-exp-1206',
        },
      ],
    }

    const result = migrateFrom6To7(oldSettings)
    expect(result.chatModels).toEqual([
      ...DEFAULT_CHAT_MODELS_V7.map((model) => {
        if (model.id === 'gpt-4o' || model.id === 'deepseek-chat') {
          return {
            ...model,
            enable: false,
          }
        }
        return model
      }),
      {
        providerType: 'gemini',
        providerId: 'gemini',
        id: 'gemini-exp-1206',
        model: 'gemini-exp-1206',
      },
    ])
  })
})
