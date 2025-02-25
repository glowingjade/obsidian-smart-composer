import { SettingMigration } from '../setting.types'

import { migrateFrom0To1 } from './0_to_1'
import { migrateFrom1To2 } from './1_to_2'
import { migrateFrom2To3 } from './2_to_3'
import { migrateFrom3To4 } from './3_to_4'

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
  {
    fromVersion: 2,
    toVersion: 3,
    migrate: migrateFrom2To3,
  },
  {
    fromVersion: 3,
    toVersion: 4,
    migrate: migrateFrom3To4,
  },
]
