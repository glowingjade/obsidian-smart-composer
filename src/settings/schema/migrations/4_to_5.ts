import { PROVIDER_TYPES_INFO } from '../../../constants'
import { SettingMigration } from '../setting.types'

export const migrateFrom4To5: SettingMigration['migrate'] = (data) => {
  const newData = { ...data }
  newData.version = 5

  if ('chatModels' in newData && Array.isArray(newData.chatModels)) {
    const existingModelsMap = new Map(
      newData.chatModels.map((model) => [model.id, model]),
    )

    const newModel = {
      providerType: 'anthropic',
      providerId: PROVIDER_TYPES_INFO.anthropic.defaultProviderId,
      id: 'claude-3.7-sonnet-thinking',
      model: 'claude-3-7-sonnet-latest',
      thinking: {
        budget_tokens: 8192,
      },
    }

    // override existing model with same id
    const existingModel = existingModelsMap.get(newModel.id)
    if (existingModel) {
      // Remove the existing model from the array
      newData.chatModels = newData.chatModels.filter(
        (model) => model.id !== newModel.id,
      )
    }
    // Add the new model at index 1 of the array
    ;(newData.chatModels as unknown[]).splice(1, 0, newModel)
  }
  return newData
}
