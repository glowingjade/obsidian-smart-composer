import { migrateFrom3To4 } from './3_to_4'

describe('settings 3_to_4 migration', () => {
  it('should add claude-3.7-sonnet model alongside existing models', () => {
    const oldSettings = {
      version: 3,
      chatModels: [
        {
          providerType: 'anthropic',
          providerId: 'anthropic',
          id: 'claude-3.5-sonnet',
          model: 'claude-3-5-sonnet-latest',
        },
        {
          providerType: 'openai',
          providerId: 'openai',
          id: 'gpt-4',
          model: 'gpt-4',
        },
      ],
      chatModelId: 'claude-3.5-sonnet',
    }

    const result = migrateFrom3To4(oldSettings)
    expect(result.version).toBe(4)
    expect(result.chatModels).toEqual([
      {
        providerType: 'anthropic',
        providerId: 'anthropic',
        id: 'claude-3.7-sonnet',
        model: 'claude-3-7-sonnet-latest',
      },
      {
        providerType: 'anthropic',
        providerId: 'anthropic',
        id: 'claude-3.5-sonnet',
        model: 'claude-3-5-sonnet-latest',
      },
      {
        providerType: 'openai',
        providerId: 'openai',
        id: 'gpt-4',
        model: 'gpt-4',
      },
    ])
    expect(result.chatModelId).toBe('claude-3.5-sonnet')
  })

  it('should update existing claude-3.7-sonnet if present', () => {
    const oldSettings = {
      version: 3,
      chatModels: [
        {
          providerType: 'anthropic',
          providerId: 'custom-provider',
          id: 'claude-3.7-sonnet',
          model: 'old-model-name',
          enable: false,
        },
      ],
      chatModelId: 'claude-3.7-sonnet',
    }

    const result = migrateFrom3To4(oldSettings)
    expect(result.version).toBe(4)
    expect(result.chatModels).toEqual([
      {
        providerType: 'anthropic',
        providerId: 'anthropic',
        id: 'claude-3.7-sonnet',
        model: 'claude-3-7-sonnet-latest',
        enable: false,
      },
    ])
    expect(result.chatModelId).toBe('claude-3.7-sonnet')
  })
})
