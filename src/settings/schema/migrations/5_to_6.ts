import { PROVIDER_TYPES_INFO } from '../../../constants'
import { SettingMigration } from '../setting.types'

/**
 * Migration from version 5 to version 6
 * - Remove deprecated 'streamingDisabled' property from OpenAI models
 * - Add 'reasoning_effort' property for OpenAI reasoning models (o1, o1-mini, o3-mini)
 * - Add o3-mini as default model
 */
export const migrateFrom5To6: SettingMigration['migrate'] = (data) => {
  const newData = { ...data }
  newData.version = 6

  // Remove deprecated 'streamingDisabled' property from OpenAI models
  if ('chatModels' in newData && Array.isArray(newData.chatModels)) {
    newData.chatModels = newData.chatModels.map((model) => {
      if (model.providerType === 'openai') {
        if ('streamingDisabled' in model) {
          delete model.streamingDisabled
        }
      }
      return model as unknown
    })
  }

  // Add 'reasoning_effort' property for OpenAI reasoning models (o1, o1-mini, o3-mini)
  if ('chatModels' in newData && Array.isArray(newData.chatModels)) {
    newData.chatModels = newData.chatModels.map((model) => {
      if (
        model.providerType === 'openai' &&
        'model' in model &&
        ['o1', 'o1-mini', 'o3-mini'].includes(model.model as string)
      ) {
        model = {
          ...model,
          reasoning_effort: 'medium',
        }
      }
      return model as unknown
    })
  }

  // Add o3-mini as default model
  if ('chatModels' in newData && Array.isArray(newData.chatModels)) {
    const existingModelsMap = new Map(
      newData.chatModels.map((model) => [model.id, model]),
    )

    const newModel = {
      providerType: 'openai',
      providerId: PROVIDER_TYPES_INFO.openai.defaultProviderId,
      id: 'o3-mini',
      model: 'o3-mini',
      reasoning_effort: 'medium',
    }

    // override existing model with same id
    const existingModel = existingModelsMap.get(newModel.id)
    if (existingModel) {
      // Remove the existing model from the array
      newData.chatModels = newData.chatModels.filter(
        (model) => model.id !== newModel.id,
      )
    }

    // Find the index of the model with id 'o1'
    const o1Index = (newData.chatModels as unknown[]).findIndex(
      (model: unknown) => {
        return (model as { id: string }).id === 'o1'
      },
    )
    const insertIndex = o1Index !== -1 ? o1Index + 1 : 0
    ;(newData.chatModels as unknown[]).splice(insertIndex, 0, newModel)
  }

  return newData
}
