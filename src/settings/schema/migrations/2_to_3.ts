import { PROVIDER_TYPES_INFO } from '../../../constants'
import { ChatModel } from '../../../types/chat-model.types'
import { LLMProvider } from '../../../types/provider.types'
import { SettingMigration } from '../setting.types'

export const NEW_DEFAULT_PROVIDERS: LLMProvider[] = [
  {
    type: 'lm-studio',
    id: PROVIDER_TYPES_INFO['lm-studio'].defaultProviderId,
  },
  {
    type: 'deepseek',
    id: PROVIDER_TYPES_INFO.deepseek.defaultProviderId,
  },
  {
    type: 'morph',
    id: PROVIDER_TYPES_INFO.morph.defaultProviderId,
  },
]

export const NEW_DEFAULT_CHAT_MODELS: ChatModel[] = [
  {
    providerType: 'deepseek',
    providerId: PROVIDER_TYPES_INFO.deepseek.defaultProviderId,
    id: 'deepseek-chat',
    model: 'deepseek-chat',
  },
  {
    providerType: 'deepseek',
    providerId: PROVIDER_TYPES_INFO.deepseek.defaultProviderId,
    id: 'deepseek-reasoner',
    model: 'deepseek-reasoner',
  },
  {
    providerType: 'morph',
    providerId: PROVIDER_TYPES_INFO.morph.defaultProviderId,
    id: 'morph-v0',
    model: 'morph-v0',
  },
]

export const migrateFrom2To3: SettingMigration['migrate'] = (data) => {
  const newData = { ...data }
  newData.version = 3

  // Handle providers migration
  if ('providers' in newData && Array.isArray(newData.providers)) {
    const existingProvidersMap = new Map(
      newData.providers.map((provider) => [provider.id, provider]),
    )

    // Add new providers, overriding provider type if ID exists
    for (const newProvider of NEW_DEFAULT_PROVIDERS) {
      const existingProvider = existingProvidersMap.get(newProvider.id)
      if (existingProvider) {
        // Override the provider type while keeping other settings
        existingProvider.type = newProvider.type
      } else {
        // Add new provider
        newData.providers.push({ ...newProvider })
      }
    }
  }

  // Handle chat models migration
  if ('chatModels' in newData && Array.isArray(newData.chatModels)) {
    const existingModelsMap = new Map(
      newData.chatModels.map((model) => [model.id, model]),
    )

    // Add new chat models, overriding if ID exists
    for (const newModel of NEW_DEFAULT_CHAT_MODELS) {
      const existingModel = existingModelsMap.get(newModel.id)
      if (existingModel) {
        // Override the model while keeping any custom settings
        Object.assign(existingModel, newModel)
      } else {
        // Add new model
        newData.chatModels.push({ ...newModel })
      }
    }
  }

  return newData
}
