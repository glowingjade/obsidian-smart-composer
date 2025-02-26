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

    let newModel = {
      providerType: 'anthropic',
      providerId: PROVIDER_TYPES_INFO.anthropic.defaultProviderId,
      id: 'claude-3.7-sonnet',
      model: 'claude-3-7-sonnet-latest',
    }

    // override existing model with same id
    const existingModel = existingModelsMap.get(newModel.id)
    if (existingModel) {
      // keep the existing model settings
      newModel = Object.assign(existingModel, newModel)
      // Remove the existing model from the array
      newData.chatModels = newData.chatModels.filter(
        (model) => model.id !== newModel.id,
      )
    }
    // Add the new model at index 0 of the array
    ;(newData.chatModels as unknown[]).splice(0, 0, newModel)
  }
  return newData
}
