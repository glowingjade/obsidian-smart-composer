import { DEFAULT_CHAT_MODELS_V11, migrateFrom10To11 } from './10_to_11'

describe('Migration from v10 to v11', () => {
  // it('should increment version to 11', () => {
  //   const oldSettings = {
  //     version: 10,
  //   }
  //   const result = migrateFrom10To11(oldSettings)
  //   expect(result.version).toBe(11)
  // })

  // it('should use default chat models if chatModels is not present', () => {
  //   const oldSettings = {
  //     version: 10,
  //   }
  //   const result = migrateFrom10To11(oldSettings)
  //   expect(result.chatModels).toEqual(DEFAULT_CHAT_MODELS_V11)
  // })

  it('should transform OpenAI models with reasoning_effort to new reasoning structure', () => {
    const oldSettings = {
      version: 10,
      chatModels: [
        {
          id: 'gpt-4o',
          providerType: 'openai',
          providerId: 'openai',
          model: 'gpt-4o',
        },
        {
          id: 'gpt-4o-mini',
          providerType: 'openai',
          providerId: 'openai',
          model: 'gpt-4o-mini',
        },
        {
          id: 'o3',
          providerType: 'openai',
          providerId: 'openai',
          model: 'o3',
          reasoning_effort: 'medium',
        },
      ],
    }
    const result = migrateFrom10To11(oldSettings)
    expect(result.chatModels).toEqual(
      DEFAULT_CHAT_MODELS_V11.map((model) => {
        if (model.id === 'o3') {
          return {
            ...model,
            reasoning: {
              enabled: true,
              reasoning_effort: 'medium',
            },
          }
        }
        return model
      }),
    )
  })

  it('should transform Anthropic models with thinking.budget_tokens to new thinking structure', () => {
    const oldSettings = {
      version: 10,
      chatModels: [
        {
          id: 'claude-3.7-sonnet-thinking',
          providerType: 'anthropic',
          providerId: 'anthropic',
          model: 'claude-3-7-sonnet-latest',
          thinking: {
            budget_tokens: 8192,
          },
        },
      ],
    }
    const result = migrateFrom10To11(oldSettings)
    expect(result.chatModels).toEqual([
      ...DEFAULT_CHAT_MODELS_V11,
      {
        id: 'claude-3.7-sonnet-thinking',
        providerType: 'anthropic',
        providerId: 'anthropic',
        model: 'claude-3-7-sonnet-latest',
        thinking: {
          enabled: true,
          budget_tokens: 8192,
        },
      },
    ])
  })

  it('should merge existing chat models with new default models', () => {
    const oldSettings = {
      version: 10,
      chatModels: [
        {
          id: 'gpt-4o',
          providerType: 'openai',
          providerId: 'openai',
          model: 'gpt-4o',
          enable: false,
        },
        {
          id: 'custom-model',
          providerType: 'custom',
          providerId: 'custom',
          model: 'custom-model',
        },
      ],
    }
    const result = migrateFrom10To11(oldSettings)

    expect(result.chatModels).toEqual([
      ...DEFAULT_CHAT_MODELS_V11.map((model) =>
        model.id === 'gpt-4o'
          ? {
              ...model,
              enable: false,
            }
          : model,
      ),
      {
        id: 'custom-model',
        providerType: 'custom',
        providerId: 'custom',
        model: 'custom-model',
      },
    ])
  })
})
