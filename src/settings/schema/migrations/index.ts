import { SettingMigration } from '../setting.types'

import { migrateFrom0To1 } from './0_to_1'

export const SETTING_MIGRATIONS: SettingMigration[] = [
  {
    fromVersion: 0,
    toVersion: 1,
    migrate: migrateFrom0To1,
  },
  // TODO: implement 1 to 2 migration
]
