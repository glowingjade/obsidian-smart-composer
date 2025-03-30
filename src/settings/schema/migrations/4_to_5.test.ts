import { migrateFrom4To5 } from './4_to_5'

describe('settings 4_to_5 migration', () => {
  it('should add claude-3.7-sonnet-thinking model at index 1', () => {
    const oldSettings = {
      version: 4,
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
          id: 'gpt-4',
          model: 'gpt-4',
        },
      ],
      chatModelId: 'claude-3.7-sonnet',
    }

    const result = migrateFrom4To5(oldSettings)
    expect(result.version).toBe(5)
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
        id: 'claude-3.7-sonnet-thinking',
        model: 'claude-3-7-sonnet-latest',
        thinking: {
          budget_tokens: 8192,
        },
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

  it('should replace existing claude-3.7-sonnet-thinking with new configuration', () => {
    const oldSettings = {
      version: 4,
      chatModels: [
        {
          providerType: 'anthropic',
          providerId: 'custom-provider',
          id: 'claude-3.7-sonnet-thinking',
          model: 'old-model-name',
          thinking: {
            budget_tokens: 1000,
          },
          enable: false,
        },
      ],
      chatModelId: 'claude-3.7-sonnet-thinking',
    }

    const result = migrateFrom4To5(oldSettings)
    expect(result.version).toBe(5)
    expect(result.chatModels).toEqual([
      {
        providerType: 'anthropic',
        providerId: 'anthropic',
        id: 'claude-3.7-sonnet-thinking',
        model: 'claude-3-7-sonnet-latest',
        thinking: {
          budget_tokens: 8192,
        },
      },
    ])
    expect(result.chatModelId).toBe('claude-3.7-sonnet-thinking')
  })
})
