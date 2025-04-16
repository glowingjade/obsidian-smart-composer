import { migrateFrom7To8 } from './7_to_8'

describe('settings 7_to_8 migration', () => {
  it('should add gpt-4.1 model before gpt-4o', () => {
    const oldSettings = {
      version: 7,
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
        },
        {
          providerType: 'openai',
          providerId: 'openai',
          id: 'gpt-4o-mini',
          model: 'gpt-4o-mini',
        },
      ],
      chatModelId: 'gpt-4o',
    }

    const result = migrateFrom7To8(oldSettings)
    expect(result.version).toBe(8)
    expect(result.chatModels).toEqual([
      {
        providerType: 'anthropic',
        providerId: 'anthropic',
        id: 'claude-3.7-sonnet',
        model: 'claude-3-7-sonnet-latest',
      },
      {
        providerType: 'openai',
        providerId: 'openai',
        id: 'gpt-4.1',
        model: 'gpt-4.1',
      },
      {
        providerType: 'openai',
        providerId: 'openai',
        id: 'gpt-4o',
        model: 'gpt-4o',
      },
      {
        providerType: 'openai',
        providerId: 'openai',
        id: 'gpt-4o-mini',
        model: 'gpt-4o-mini',
      },
    ])
    expect(result.chatModelId).toBe('gpt-4o')
  })

  it('should replace existing gpt-4.1 with new configuration', () => {
    const oldSettings = {
      version: 7,
      chatModels: [
        {
          providerType: 'openai',
          providerId: 'custom-provider',
          id: 'gpt-4.1',
          model: 'custom-model-name',
          enable: false,
        },
      ],
      chatModelId: 'gpt-4.1',
    }

    const result = migrateFrom7To8(oldSettings)
    expect(result.version).toBe(8)
    expect(result.chatModels).toEqual([
      {
        providerType: 'openai',
        providerId: 'openai',
        id: 'gpt-4.1',
        model: 'gpt-4.1',
      },
    ])
    expect(result.chatModelId).toBe('gpt-4.1')
  })

  it('should add after another OpenAI model if gpt-4o doesnt exist', () => {
    const oldSettings = {
      version: 7,
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
          id: 'other-openai-model',
          model: 'other-openai-model',
        },
      ],
    }

    const result = migrateFrom7To8(oldSettings)
    expect(result.version).toBe(8)
    expect(result.chatModels).toEqual([
      {
        providerType: 'anthropic',
        providerId: 'anthropic',
        id: 'claude-3.7-sonnet',
        model: 'claude-3-7-sonnet-latest',
      },
      {
        providerType: 'openai',
        providerId: 'openai',
        id: 'other-openai-model',
        model: 'other-openai-model',
      },
      {
        providerType: 'openai',
        providerId: 'openai',
        id: 'gpt-4.1',
        model: 'gpt-4.1',
      },
    ])
  })
})
