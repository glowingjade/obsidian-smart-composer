import { SettingMigration } from '../setting.types'

export const migrateFrom16To17: SettingMigration['migrate'] = (data) => {
  return { ...data, version: 17 }
}
