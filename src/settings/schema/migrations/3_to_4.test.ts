import { migrateFrom3To4 } from './3_to_4'

describe('settings 3_to_4 migration', () => {
  it('should migrate claude-3.5-sonnet model to claude-3.7-sonnet', () => {
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
        providerType: 'openai',
        providerId: 'openai',
        id: 'gpt-4',
        model: 'gpt-4',
      },
    ])
    expect(result.chatModelId).toBe('claude-3.7-sonnet')
  })

  it('should not modify other models', () => {
    const oldSettings = {
      version: 3,
      chatModels: [
        {
          providerType: 'anthropic',
          providerId: 'anthropic',
          id: 'claude-3.5-haiku',
          model: 'claude-3-5-haiku-latest',
        },
        {
          providerType: 'openai',
          providerId: 'openai',
          id: 'gpt-4',
          model: 'gpt-4',
        },
      ],
      chatModelId: 'gpt-4',
    }

    const result = migrateFrom3To4(oldSettings)
    expect(result.version).toBe(4)
    expect(result.chatModels).toEqual(oldSettings.chatModels)
    expect(result.chatModelId).toBe(oldSettings.chatModelId)
  })

  it('should handle missing chatModels array', () => {
    const oldSettings = {
      version: 3,
      chatModelId: 'claude-3.5-sonnet',
    }

    const result = migrateFrom3To4(oldSettings)
    expect(result.version).toBe(4)
    expect(result.chatModelId).toBe('claude-3.7-sonnet')
  })

  it('should handle missing chatModelId', () => {
    const oldSettings = {
      version: 3,
      chatModels: [
        {
          providerType: 'anthropic',
          providerId: 'anthropic',
          id: 'claude-3.5-sonnet',
          model: 'claude-3-5-sonnet-latest',
        },
      ],
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
    ])
  })
})
