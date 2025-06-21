import { SettingMigration } from '../setting.types'

import { DEFAULT_CHAT_MODELS_V9 } from './8_to_9'
import { DefaultChatModels, getMigratedChatModels } from './migrationUtils'

/**
 * Migration from version 10 to version 11
 * - Update the Gemini 2.5 Pro model from gemini-2.5-pro-preview-03-25 to gemini-2.5-pro
 */

export const DEFAULT_CHAT_MODELS_V11: DefaultChatModels =
  DEFAULT_CHAT_MODELS_V9.map((model) => {
    if (model.id === 'gemini-2.5-pro') {
      return { ...model, model: 'gemini-2.5-pro' }
    }
    return model
  })

export const migrateFrom10To11: SettingMigration['migrate'] = (data) => {
  const newData = { ...data }
  newData.version = 11
  newData.chatModels = getMigratedChatModels(newData, DEFAULT_CHAT_MODELS_V11)
  return newData
}
