import { DEFAULT_CHAT_MODELS_V13, migrateFrom12To13 } from './12_to_13'

describe('Migration from v12 to v13', () => {
  it('should increment version to 13', () => {
    const oldSettings = {
      version: 12,
    }
    const result = migrateFrom12To13(oldSettings)
    expect(result.version).toBe(13)
  })

  it('should merge existing chat models with new default models', () => {
    const oldSettings = {
      version: 12,
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
    const result = migrateFrom12To13(oldSettings)

    expect(result.chatModels).toEqual([
      ...DEFAULT_CHAT_MODELS_V13.map((model) =>
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

  it('should add new GPT-5.1 model', () => {
    const oldSettings = {
      version: 12,
      chatModels: [
        {
          id: 'gpt-4o',
          providerType: 'openai',
          providerId: 'openai',
          model: 'gpt-4o',
        },
      ],
    }
    const result = migrateFrom12To13(oldSettings)

    const chatModels = result.chatModels as { id: string }[]
    const gpt51 = chatModels.find((m) => m.id === 'gpt-5.1')

    expect(gpt51).toBeDefined()
    expect(gpt51).toEqual({
      id: 'gpt-5.1',
      providerType: 'openai',
      providerId: 'openai',
      model: 'gpt-5.1',
    })
  })

  it('should preserve gpt-5 as custom model when migrating', () => {
    const oldSettings = {
      version: 12,
      chatModels: [
        {
          id: 'gpt-5',
          providerType: 'openai',
          providerId: 'openai',
          model: 'gpt-5',
          enable: true,
        },
        {
          id: 'gpt-4o',
          providerType: 'openai',
          providerId: 'openai',
          model: 'gpt-4o',
        },
      ],
    }
    const result = migrateFrom12To13(oldSettings)

    const chatModels = result.chatModels as { id: string }[]
    const gpt5 = chatModels.find((m) => m.id === 'gpt-5')
    const gpt51 = chatModels.find((m) => m.id === 'gpt-5.1')

    // gpt-5 should be preserved as custom model
    expect(gpt5).toBeDefined()
    expect(gpt5).toEqual({
      id: 'gpt-5',
      providerType: 'openai',
      providerId: 'openai',
      model: 'gpt-5',
      enable: true,
    })

    // gpt-5.1 should be added as new default
    expect(gpt51).toBeDefined()
    expect(gpt51).toEqual({
      id: 'gpt-5.1',
      providerType: 'openai',
      providerId: 'openai',
      model: 'gpt-5.1',
    })
  })

  it('should preserve gpt-4.1 models as custom models when migrating', () => {
    const oldSettings = {
      version: 12,
      chatModels: [
        {
          id: 'gpt-4.1',
          providerType: 'openai',
          providerId: 'openai',
          model: 'gpt-4.1',
          enable: true,
        },
        {
          id: 'gpt-4.1-mini',
          providerType: 'openai',
          providerId: 'openai',
          model: 'gpt-4.1-mini',
        },
        {
          id: 'gpt-4.1-nano',
          providerType: 'openai',
          providerId: 'openai',
          model: 'gpt-4.1-nano',
        },
        {
          id: 'gpt-4o',
          providerType: 'openai',
          providerId: 'openai',
          model: 'gpt-4o',
        },
      ],
    }
    const result = migrateFrom12To13(oldSettings)

    const chatModels = result.chatModels as { id: string }[]
    const gpt41 = chatModels.find((m) => m.id === 'gpt-4.1')
    const gpt41Mini = chatModels.find((m) => m.id === 'gpt-4.1-mini')
    const gpt41Nano = chatModels.find((m) => m.id === 'gpt-4.1-nano')
    const gpt51 = chatModels.find((m) => m.id === 'gpt-5.1')

    // gpt-4.1 models should be preserved as custom models
    expect(gpt41).toBeDefined()
    expect(gpt41).toEqual({
      id: 'gpt-4.1',
      providerType: 'openai',
      providerId: 'openai',
      model: 'gpt-4.1',
      enable: true,
    })

    expect(gpt41Mini).toBeDefined()
    expect(gpt41Mini).toEqual({
      id: 'gpt-4.1-mini',
      providerType: 'openai',
      providerId: 'openai',
      model: 'gpt-4.1-mini',
    })

    expect(gpt41Nano).toBeDefined()
    expect(gpt41Nano).toEqual({
      id: 'gpt-4.1-nano',
      providerType: 'openai',
      providerId: 'openai',
      model: 'gpt-4.1-nano',
    })

    // gpt-5.1 should be added as new default
    expect(gpt51).toBeDefined()
    expect(gpt51).toEqual({
      id: 'gpt-5.1',
      providerType: 'openai',
      providerId: 'openai',
      model: 'gpt-5.1',
    })
  })
})
