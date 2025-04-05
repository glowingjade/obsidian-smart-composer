import { migrateFrom5To6 } from './5_to_6'

describe('Migrate from version 5 to 6', () => {
  test('should remove streamingDisabled from openai models', () => {
    const oldSettings = {
      version: 5,
      chatModels: [
        {
          providerType: 'openai',
          providerId: 'openai-1',
          id: 'gpt-4',
          model: 'gpt-4',
          enable: true,
          streamingDisabled: false,
        },
        {
          providerType: 'anthropic',
          providerId: 'anthropic-1',
          id: 'claude-3-opus',
          model: 'claude-3-opus',
          enable: true,
        },
      ],
    }

    const result = migrateFrom5To6(oldSettings)
    expect(result.version).toBe(6)
    expect(result.chatModels).toEqual([
      {
        providerType: 'openai',
        providerId: 'openai',
        id: 'o3-mini',
        model: 'o3-mini',
        reasoning_effort: 'medium',
      },
      {
        providerType: 'openai',
        providerId: 'openai-1',
        id: 'gpt-4',
        model: 'gpt-4',
        enable: true,
      },
      {
        providerType: 'anthropic',
        providerId: 'anthropic-1',
        id: 'claude-3-opus',
        model: 'claude-3-opus',
        enable: true,
      },
    ])
  })

  test('should add reasoning_effort to OpenAI reasoning models and add o3-mini as default model', () => {
    const oldSettings = {
      version: 5,
      chatModels: [
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
          providerId: 'openai-1',
          id: 'o1',
          model: 'o1',
          streamingDisabled: true,
        },
        {
          providerType: 'openai',
          providerId: 'openai-1',
          id: 'o1-mini',
          model: 'o1-mini',
          enable: false,
          streamingDisabled: false,
        },
        {
          providerType: 'openai',
          providerId: 'openai-1',
          id: 'gpt-4',
          model: 'gpt-4',
        },
      ],
    }

    const result = migrateFrom5To6(oldSettings)
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
        providerId: 'openai-1',
        id: 'o1',
        model: 'o1',
        reasoning_effort: 'medium',
      },
      {
        providerType: 'openai',
        providerId: 'openai',
        id: 'o3-mini',
        model: 'o3-mini',
        reasoning_effort: 'medium',
      },
      {
        providerType: 'openai',
        providerId: 'openai-1',
        id: 'o1-mini',
        model: 'o1-mini',
        reasoning_effort: 'medium',
        enable: false,
      },
      {
        providerType: 'openai',
        providerId: 'openai-1',
        id: 'gpt-4',
        model: 'gpt-4',
      },
    ])
  })

  test('should replace existing model with id o3-mini', () => {
    const oldSettings = {
      version: 5,
      chatModels: [
        {
          providerType: 'anthropic',
          providerId: 'anthropic',
          id: 'claude-3.7-sonnet',
          model: 'claude-3-7-sonnet-latest',
        },
        {
          providerType: 'openai',
          providerId: 'openai-1',
          id: 'o1',
          model: 'o1',
          streamingDisabled: true,
        },
        {
          providerType: 'gemini',
          providerId: 'gemini',
          id: 'gemini-1.5-pro',
          model: 'gemini-1.5-pro',
          enable: false,
        },
        {
          providerType: 'openai',
          providerId: 'openai',
          id: 'o3-mini',
          model: 'o3-mini-custom',
        },
      ],
    }

    const result = migrateFrom5To6(oldSettings)
    expect(result.chatModels).toEqual([
      {
        providerType: 'anthropic',
        providerId: 'anthropic',
        id: 'claude-3.7-sonnet',
        model: 'claude-3-7-sonnet-latest',
      },
      {
        providerType: 'openai',
        providerId: 'openai-1',
        id: 'o1',
        model: 'o1',
        reasoning_effort: 'medium',
      },
      {
        providerType: 'openai',
        providerId: 'openai',
        id: 'o3-mini',
        model: 'o3-mini',
        reasoning_effort: 'medium',
      },
      {
        providerType: 'gemini',
        providerId: 'gemini',
        id: 'gemini-1.5-pro',
        model: 'gemini-1.5-pro',
        enable: false,
      },
    ])
  })
})
