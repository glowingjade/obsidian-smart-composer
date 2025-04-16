import { PROVIDER_TYPES_INFO } from '../../../constants'
import { SettingMigration } from '../setting.types'

/**
 * Migration from version 7 to version 8
 * - Add gpt-4.1 model
 */
export const migrateFrom7To8: SettingMigration['migrate'] = (data) => {
  const newData = { ...data }
  newData.version = 8

  if ('chatModels' in newData && Array.isArray(newData.chatModels)) {
    const existingModelsMap = new Map(
      newData.chatModels.map((model) => [model.id, model]),
    )

    const newModel = {
      providerType: 'openai',
      providerId: PROVIDER_TYPES_INFO.openai.defaultProviderId,
      id: 'gpt-4.1',
      model: 'gpt-4.1',
    }

    // Override existing model with same id if it exists
    const existingModel = existingModelsMap.get(newModel.id)
    if (existingModel) {
      // Remove the existing model from the array
      newData.chatModels = newData.chatModels.filter(
        (model) => model.id !== newModel.id,
      )
    }

    // Find the position of gpt-4o model to insert before it
    const gpt4oIndex = (newData.chatModels as unknown[]).findIndex(
      (model: unknown) => {
        return (model as { id: string }).id === 'gpt-4o'
      }
    )

    if (gpt4oIndex !== -1) {
      // Insert before gpt-4o
      (newData.chatModels as unknown[]).splice(gpt4oIndex, 0, newModel)
    } else {
      // If gpt-4o doesn't exist, find any OpenAI model
      const openaiModelIndex = (newData.chatModels as unknown[]).findIndex(
        (model: unknown) => {
          return (model as { providerType: string }).providerType === 'openai'
        }
      )

      if (openaiModelIndex !== -1) {
        // Add after the first OpenAI model found
        (newData.chatModels as unknown[]).splice(openaiModelIndex + 1, 0, newModel)
      } else {
        // As a last resort, add to the end
        (newData.chatModels as unknown[]).push(newModel)
      }
    }
  }

  return newData
}
