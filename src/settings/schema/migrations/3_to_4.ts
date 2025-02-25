import { SettingMigration } from '../setting.types'

export const migrateFrom3To4: SettingMigration['migrate'] = (data) => {
  const newData = { ...data }
  newData.version = 4

  // Handle chat models migration
  if ('chatModels' in newData && Array.isArray(newData.chatModels)) {
    for (const model of newData.chatModels) {
      if (
        model.providerType === 'anthropic' &&
        model.id === 'claude-3.5-sonnet' &&
        model.model === 'claude-3-5-sonnet-latest'
      ) {
        model.id = 'claude-3.7-sonnet'
        model.model = 'claude-3-7-sonnet-latest'
      }
    }
  }

  // Update selected chat model if it was claude-3.5-sonnet
  if (
    'chatModelId' in newData &&
    typeof newData.chatModelId === 'string' &&
    newData.chatModelId === 'claude-3.5-sonnet'
  ) {
    newData.chatModelId = 'claude-3.7-sonnet'
  }

  return newData
}
