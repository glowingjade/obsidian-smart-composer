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

  it('should add claude-opus-4.5 as new default model', () => {
    const oldSettings = {
      version: 13,
      chatModels: [
        {
          id: 'claude-sonnet-4.5',
          providerType: 'anthropic',
          providerId: 'anthropic',
          model: 'claude-sonnet-4-5',
        },
      ],
    }
    const result = migrateFrom13To14(oldSettings)

    const chatModels = result.chatModels as { id: string }[]
    const opus45 = chatModels.find((m) => m.id === 'claude-opus-4.5')

    // claude-opus-4.5 should be added as new default
    expect(opus45).toBeDefined()
    expect(opus45).toEqual({
      id: 'claude-opus-4.5',
      providerType: 'anthropic',
      providerId: 'anthropic',
      model: 'claude-opus-4-5',
    })
  })

  it('should preserve claude-opus-4.1 as custom model when migrating', () => {
    const oldSettings = {
      version: 13,
      chatModels: [
        {
          id: 'claude-opus-4.1',
          providerType: 'anthropic',
          providerId: 'anthropic',
          model: 'claude-opus-4-1',
          enable: true,
        },
      ],
    }
    const result = migrateFrom13To14(oldSettings)

    const chatModels = result.chatModels as { id: string }[]
    const opus41 = chatModels.find((m) => m.id === 'claude-opus-4.1')
    const opus45 = chatModels.find((m) => m.id === 'claude-opus-4.5')

    // claude-opus-4.1 should be preserved as custom model
    expect(opus41).toBeDefined()
    expect(opus41).toEqual({
      id: 'claude-opus-4.1',
      providerType: 'anthropic',
      providerId: 'anthropic',
      model: 'claude-opus-4-1',
      enable: true,
    })

    // claude-opus-4.5 should be added as new default
    expect(opus45).toBeDefined()
    expect(opus45).toEqual({
      id: 'claude-opus-4.5',
      providerType: 'anthropic',
      providerId: 'anthropic',
      model: 'claude-opus-4-5',
    })
  })

  it('should add gemini-3-pro-preview and gemini-3-flash-preview as new default models', () => {
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
    const gemini3Pro = chatModels.find((m) => m.id === 'gemini-3-pro-preview')
    const gemini3Flash = chatModels.find(
      (m) => m.id === 'gemini-3-flash-preview',
    )

    // gemini-3-pro-preview should be added as new default
    expect(gemini3Pro).toBeDefined()
    expect(gemini3Pro).toEqual({
      id: 'gemini-3-pro-preview',
      providerType: 'gemini',
      providerId: 'gemini',
      model: 'gemini-3-pro-preview',
    })

    // gemini-3-flash-preview should be added as new default
    expect(gemini3Flash).toBeDefined()
    expect(gemini3Flash).toEqual({
      id: 'gemini-3-flash-preview',
      providerType: 'gemini',
      providerId: 'gemini',
      model: 'gemini-3-flash-preview',
    })
  })

  it('should preserve gemini-2.5-pro as custom model when migrating', () => {
    const oldSettings = {
      version: 13,
      chatModels: [
        {
          id: 'gemini-2.5-pro',
          providerType: 'gemini',
          providerId: 'gemini',
          model: 'gemini-2.5-pro',
          enable: true,
        },
      ],
    }
    const result = migrateFrom13To14(oldSettings)

    const chatModels = result.chatModels as { id: string }[]
    const gemini25Pro = chatModels.find((m) => m.id === 'gemini-2.5-pro')
    const gemini3Pro = chatModels.find((m) => m.id === 'gemini-3-pro-preview')

    // gemini-2.5-pro should be preserved as custom model
    expect(gemini25Pro).toBeDefined()
    expect(gemini25Pro).toEqual({
      id: 'gemini-2.5-pro',
      providerType: 'gemini',
      providerId: 'gemini',
      model: 'gemini-2.5-pro',
      enable: true,
    })

    // gemini-3-pro-preview should be added as new default
    expect(gemini3Pro).toBeDefined()
    expect(gemini3Pro).toEqual({
      id: 'gemini-3-pro-preview',
      providerType: 'gemini',
      providerId: 'gemini',
      model: 'gemini-3-pro-preview',
    })
  })
})
