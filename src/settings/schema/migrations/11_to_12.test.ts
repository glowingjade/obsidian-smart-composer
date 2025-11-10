import { DEFAULT_CHAT_MODELS_V12, migrateFrom11To12 } from './11_to_12'

describe('Migration from v11 to v12', () => {
  it('should increment version to 12', () => {
    const oldSettings = {
      version: 11,
    }
    const result = migrateFrom11To12(oldSettings)
    expect(result.version).toBe(12)
  })

  it('should merge existing chat models with new default models', () => {
    const oldSettings = {
      version: 11,
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
    const result = migrateFrom11To12(oldSettings)

    expect(result.chatModels).toEqual([
      ...DEFAULT_CHAT_MODELS_V12.map((model) =>
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

  it('should add new Claude Sonnet 4.5 and Haiku 4.5 models', () => {
    const oldSettings = {
      version: 11,
      chatModels: [
        {
          id: 'gpt-4o',
          providerType: 'openai',
          providerId: 'openai',
          model: 'gpt-4o',
        },
      ],
    }
    const result = migrateFrom11To12(oldSettings)

    const chatModels = result.chatModels as { id: string }[]
    const sonnet45 = chatModels.find((m) => m.id === 'claude-sonnet-4.5')
    const haiku45 = chatModels.find((m) => m.id === 'claude-haiku-4.5')

    expect(sonnet45).toBeDefined()
    expect(sonnet45).toEqual({
      id: 'claude-sonnet-4.5',
      providerType: 'anthropic',
      providerId: 'anthropic',
      model: 'claude-sonnet-4-5',
    })

    expect(haiku45).toBeDefined()
    expect(haiku45).toEqual({
      id: 'claude-haiku-4.5',
      providerType: 'anthropic',
      providerId: 'anthropic',
      model: 'claude-haiku-4-5',
    })
  })
})
