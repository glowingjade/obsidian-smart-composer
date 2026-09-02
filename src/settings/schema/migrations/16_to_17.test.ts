import { DEFAULT_CHAT_MODELS } from '../../../constants'

import { DEFAULT_CHAT_MODELS_V17, migrateFrom16To17 } from './16_to_17'

describe('Migration from v16 to v17', () => {
  it('should replace old defaults and preserve custom models', () => {
    const customModel = {
      providerType: 'openai-compatible',
      providerId: 'custom',
      id: 'custom-model',
      model: 'custom-model',
      enable: false,
    }

    const result = migrateFrom16To17({
      version: 16,
      chatModels: [
        {
          providerType: 'anthropic',
          providerId: 'anthropic',
          id: 'claude-sonnet-4.5',
          model: 'claude-sonnet-4-5',
          enable: false,
        },
        {
          providerType: 'openai',
          providerId: 'openai',
          id: 'gpt-4.1-mini',
          model: 'gpt-4.1-mini',
        },
        customModel,
      ],
      chatModelId: 'claude-sonnet-4.5',
      applyModelId: 'gpt-4.1-mini',
    })

    expect(result.version).toBe(17)
    expect(DEFAULT_CHAT_MODELS_V17).toEqual(DEFAULT_CHAT_MODELS)
    expect(result.chatModels).toEqual([...DEFAULT_CHAT_MODELS_V17, customModel])
    expect(result.chatModelId).toBe('claude-opus-5')
    expect(result.applyModelId).toBe('gpt-5.6-luna (plan)')
  })

  it('should preserve custom selections', () => {
    const result = migrateFrom16To17({
      version: 16,
      chatModelId: 'custom-chat',
      applyModelId: 'custom-apply',
    })

    expect(result.chatModelId).toBe('custom-chat')
    expect(result.applyModelId).toBe('custom-apply')
  })
})
