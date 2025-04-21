import { ChatModel } from '../../../types/chat-model.types'

import { DEFAULT_CHAT_MODELS_V8, migrateFrom7To8 } from './7_to_8'

describe('settings 7_to_8 migration', () => {
  describe('when chat models are not present', () => {
    it('should use default chat models', () => {
      const oldSettings = {
        version: 7,
      }
      const migratedSettings = migrateFrom7To8(oldSettings)
      expect(migratedSettings.version).toBe(8)
      expect(migratedSettings.chatModels).toEqual(DEFAULT_CHAT_MODELS_V8)
    })

    it('removes o3-mini and o1 models from the default chat models', () => {
      const oldSettings = {
        version: 7,
      }
      const migratedSettings = migrateFrom7To8(oldSettings)
      expect(migratedSettings.version).toBe(8)

      // More succinct way to check for missing models with proper type annotation
      const modelIds = (migratedSettings.chatModels as ChatModel[]).map(
        (model: ChatModel) => model.id,
      )
      expect(modelIds).not.toContain('o1')
      expect(modelIds).not.toContain('o3-mini')
    })
  })

  describe('when existing chat models are present', () => {
    it('should add default models and preserve custom models', () => {
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
            providerType: 'openai-compatible',
            providerId: 'cohere',
            id: 'cohere-model',
            model: 'cohere-model',
            enable: false,
          },
        ],
      }
      const migratedSettings = migrateFrom7To8(oldSettings)
      expect(migratedSettings.chatModels).toEqual([
        ...DEFAULT_CHAT_MODELS_V8,
        {
          providerType: 'openai-compatible',
          providerId: 'cohere',
          id: 'cohere-model',
          model: 'cohere-model',
          enable: false,
        },
      ])
    })

    it('should replace models that are in the new default models', () => {
      const oldSettings = {
        version: 7,
        chatModels: [
          {
            providerType: 'openai',
            providerId: 'openai',
            id: 'gpt-4.1',
            model: 'Custom gpt-4.1',
            enable: false,
          },
          {
            providerType: 'openai',
            providerId: 'openai',
            id: 'gpt-4.1-mini',
            model: 'Custom gpt-4.1-mini',
            enable: false,
          },
          {
            providerType: 'openai',
            providerId: 'openai',
            id: 'gpt-4.1-nano',
            model: 'Custom gpt-4.1-nano',
            enable: false,
          },
          {
            providerType: 'openai',
            providerId: 'openai',
            id: 'o3',
            model: 'Custom o3',
            enable: false,
          },
          {
            providerType: 'openai',
            providerId: 'openai',
            id: 'o4-mini',
            model: 'Custom o4-mini',
            enable: false,
          },
          {
            providerType: 'gemini',
            providerId: 'gemini',
            id: 'gemini-exp-1206',
            model: 'gemini-exp-1206',
          },
        ],
      }

      const migratedSettings = migrateFrom7To8(oldSettings)
      const expectedCustomDisabledModelIds = [
        'gpt-4.1',
        'gpt-4.1-mini',
        'gpt-4.1-nano',
        'o3',
        'o4-mini',
      ]
      const expectedDefaultAndCustomModels = [
        ...DEFAULT_CHAT_MODELS_V8.map((model) => {
          if (expectedCustomDisabledModelIds.includes(model.id)) {
            return {
              ...model,
              enable: false,
            }
          }
          return model
        }),
        {
          providerType: 'gemini',
          providerId: 'gemini',
          id: 'gemini-exp-1206',
          model: 'gemini-exp-1206',
        },
      ]

      expect(migratedSettings.chatModels).toEqual(
        expectedDefaultAndCustomModels,
      )
    })

    it('keeps o3-mini and o1 models as custom models if they were already there', () => {
      const oldSettings = {
        version: 7,
        chatModels: [
          {
            providerType: 'openai',
            providerId: 'openai',
            id: 'o3-mini',
            model: 'o3-mini',
            reasoning_effort: 'medium',
            enable: true,
          },
          {
            providerType: 'openai',
            providerId: 'openai',
            id: 'o1',
            model: 'o1',
            reasoning_effort: 'medium',
            enable: false,
          },
        ],
      }

      const migratedSettings = migrateFrom7To8(oldSettings)
      expect(migratedSettings.chatModels).toEqual([
        ...DEFAULT_CHAT_MODELS_V8,
        {
          providerType: 'openai',
          providerId: 'openai',
          id: 'o3-mini',
          model: 'o3-mini',
          reasoning_effort: 'medium',
          enable: true,
        },
        {
          providerType: 'openai',
          providerId: 'openai',
          id: 'o1',
          model: 'o1',
          reasoning_effort: 'medium',
          enable: false,
        },
      ])
    })
  })
})
