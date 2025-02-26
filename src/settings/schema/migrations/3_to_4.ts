import { PROVIDER_TYPES_INFO } from '../../../constants'
import { SettingMigration } from '../setting.types'

export const migrateFrom3To4: SettingMigration['migrate'] = (data) => {
  const newData = { ...data }
  newData.version = 4

  // Handle chat models migration
  if ('chatModels' in newData && Array.isArray(newData.chatModels)) {
    const existingModelsMap = new Map(
      newData.chatModels.map((model) => [model.id, model]),
    )

    const newModel = {
      providerType: 'anthropic',
      providerId: PROVIDER_TYPES_INFO.anthropic.defaultProviderId,
      id: 'claude-3.7-sonnet',
      model: 'claude-3-7-sonnet-latest',
    }

    // Add new model, overriding if ID exists
    const existingModel = existingModelsMap.get(newModel.id)
    if (existingModel) {
      // Override the model while keeping any custom settings
      Object.assign(existingModel, newModel)
    } else {
      // Add new model
      newData.chatModels.push(newModel)
    }
  }

  return newData
}
