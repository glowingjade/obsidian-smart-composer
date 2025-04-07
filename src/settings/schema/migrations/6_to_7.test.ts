import { DEFAULT_CHAT_MODELS_V7, migrateFrom6To7 } from './6_to_7'

describe('Migration from v6 to v7', () => {
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
          providerId: 'perplexity',
          id: 'perplexity-sonar',
          model: 'sonar',
          enable: false,
        },
      ],
    }
    const result = migrateFrom6To7(oldSettings)
    expect(result.chatModels).toEqual([
      ...DEFAULT_CHAT_MODELS_V7,
      {
        providerType: 'openai-compatible',
        providerId: 'perplexity',
        id: 'perplexity-sonar',
        model: 'sonar',
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
