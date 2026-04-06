import { SettingMigration } from '../setting.types'

export const migrateFrom16To17: SettingMigration['migrate'] = (data) => {
  const newData = { ...data }
  newData.version = 17

  const existingChatOptions =
    typeof newData.chatOptions === 'object' && newData.chatOptions !== null
      ? (newData.chatOptions as Record<string, unknown>)
      : {}

  newData.chatOptions = {
    includeCurrentFileContent:
      typeof existingChatOptions.includeCurrentFileContent === 'boolean'
        ? existingChatOptions.includeCurrentFileContent
        : true,
    enableTools:
      typeof existingChatOptions.enableTools === 'boolean'
        ? existingChatOptions.enableTools
        : true,
    maxAutoIterations:
      typeof existingChatOptions.maxAutoIterations === 'number'
        ? existingChatOptions.maxAutoIterations
        : 1,
    responseLanguage:
      existingChatOptions.responseLanguage === 'ko' ||
      existingChatOptions.responseLanguage === 'en' ||
      existingChatOptions.responseLanguage === 'auto'
        ? existingChatOptions.responseLanguage
        : 'auto',
  }

  return newData
}
