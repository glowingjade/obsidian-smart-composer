import { SettingMigration } from '../setting.types'

// Provider IDs at version 3 (hardcoded to avoid dependency on current constants)
const V3_PROVIDER_IDS = {
  'lm-studio': 'lm-studio',
  deepseek: 'deepseek',
  morph: 'morph',
} as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const NEW_DEFAULT_PROVIDERS: any[] = [
  {
    type: 'lm-studio',
    id: V3_PROVIDER_IDS['lm-studio'],
  },
  {
    type: 'deepseek',
    id: V3_PROVIDER_IDS.deepseek,
  },
  {
    type: 'morph',
    id: V3_PROVIDER_IDS.morph,
  },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const NEW_DEFAULT_CHAT_MODELS: any[] = [
  {
    providerType: 'deepseek',
    providerId: V3_PROVIDER_IDS.deepseek,
    id: 'deepseek-chat',
    model: 'deepseek-chat',
  },
  {
    providerType: 'deepseek',
    providerId: V3_PROVIDER_IDS.deepseek,
    id: 'deepseek-reasoner',
    model: 'deepseek-reasoner',
  },
  {
    providerType: 'morph',
    providerId: V3_PROVIDER_IDS.morph,
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
