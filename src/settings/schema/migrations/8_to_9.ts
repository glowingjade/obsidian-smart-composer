import { SettingMigration } from '../setting.types'

import { DEFAULT_CHAT_MODELS_V8 } from './7_to_8'
import { DefaultChatModels, getMigratedChatModels } from './migrationUtils'

/**
 * Migration from version 8 to version 9
 * - Update the Gemini 2.5 Pro model from gemini-2.5-pro-preview-03-25 to gemini-2.5-pro-exp-03-25
 */

export const DEFAULT_CHAT_MODELS_V9: DefaultChatModels =
  DEFAULT_CHAT_MODELS_V8.map((model) => {
    if (model.id === 'gemini-2.5-pro') {
      return { ...model, model: 'gemini-2.5-pro-exp-03-25' }
    }
    return model
  })

export const migrateFrom8To9: SettingMigration['migrate'] = (data) => {
  const newData = { ...data }
  newData.version = 9
  newData.chatModels = getMigratedChatModels(newData, DEFAULT_CHAT_MODELS_V9)
  return newData
}
