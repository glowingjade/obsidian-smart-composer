import { DEFAULT_CHAT_MODELS_V14, migrateFrom13To14 } from './13_to_14'

describe('Migration from v13 to v14', () => {
  it('should increment version to 14', () => {
    const oldSettings = {
      version: 13,
    }
    const result = migrateFrom13To14(oldSettings)
    expect(result.version).toBe(14)
  })

  it('should merge existing chat models with new default models', () => {
    const oldSettings = {
      version: 13,
      chatModels: [
        {
          id: 'gpt-5-mini',
          providerType: 'openai',
          providerId: 'openai',
          model: 'gpt-5-mini',
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
    const result = migrateFrom13To14(oldSettings)

    expect(result.chatModels).toEqual([
      ...DEFAULT_CHAT_MODELS_V14.map((model) =>
        model.id === 'gpt-5-mini'
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

  it('should add new GPT-5.2 model', () => {
    const oldSettings = {
      version: 13,
      chatModels: [
        {
          id: 'gpt-5-mini',
          providerType: 'openai',
          providerId: 'openai',
          model: 'gpt-5-mini',
        },
      ],
    }
    const result = migrateFrom13To14(oldSettings)

    const chatModels = result.chatModels as { id: string }[]
    const gpt52 = chatModels.find((m) => m.id === 'gpt-5.2')

    expect(gpt52).toBeDefined()
    expect(gpt52).toEqual({
      id: 'gpt-5.2',
      providerType: 'openai',
      providerId: 'openai',
      model: 'gpt-5.2',
    })
  })

  it('should add new gpt-4.1-mini model', () => {
    const oldSettings = {
      version: 13,
      chatModels: [
        {
          id: 'gpt-5-mini',
          providerType: 'openai',
          providerId: 'openai',
          model: 'gpt-5-mini',
        },
      ],
    }
    const result = migrateFrom13To14(oldSettings)

    const chatModels = result.chatModels as { id: string }[]
    const gpt41mini = chatModels.find((m) => m.id === 'gpt-4.1-mini')

    expect(gpt41mini).toBeDefined()
    expect(gpt41mini).toEqual({
      id: 'gpt-4.1-mini',
      providerType: 'openai',
      providerId: 'openai',
      model: 'gpt-4.1-mini',
    })
  })

  it('should preserve gpt-5.1 as custom model when migrating', () => {
    const oldSettings = {
      version: 13,
      chatModels: [
        {
          id: 'gpt-5.1',
          providerType: 'openai',
          providerId: 'openai',
          model: 'gpt-5.1',
          enable: true,
        },
        {
          id: 'gpt-5-mini',
          providerType: 'openai',
          providerId: 'openai',
          model: 'gpt-5-mini',
        },
      ],
    }
    const result = migrateFrom13To14(oldSettings)

    const chatModels = result.chatModels as { id: string }[]
    const gpt51 = chatModels.find((m) => m.id === 'gpt-5.1')
    const gpt52 = chatModels.find((m) => m.id === 'gpt-5.2')

    // gpt-5.1 should be preserved as custom model
    expect(gpt51).toBeDefined()
    expect(gpt51).toEqual({
      id: 'gpt-5.1',
      providerType: 'openai',
      providerId: 'openai',
      model: 'gpt-5.1',
      enable: true,
    })

    // gpt-5.2 should be added as new default
    expect(gpt52).toBeDefined()
    expect(gpt52).toEqual({
      id: 'gpt-5.2',
      providerType: 'openai',
      providerId: 'openai',
      model: 'gpt-5.2',
    })
  })
})
