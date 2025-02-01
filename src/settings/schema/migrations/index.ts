import { SettingMigration } from '../setting.types'

import { migrateFrom0To1 } from './0_to_1'
import { migrateFrom1To2 } from './1_to_2'

export const SETTING_MIGRATIONS: SettingMigration[] = [
  {
    fromVersion: 0,
    toVersion: 1,
    migrate: migrateFrom0To1,
  },
  {
    fromVersion: 1,
    toVersion: 2,
    migrate: migrateFrom1To2,
  },
]
