import { SettingMigration } from '../setting.types'

import { migrateFrom0To1 } from './0_to_1'
import { migrateFrom1To2 } from './1_to_2'
import { migrateFrom2To3 } from './2_to_3'
import { migrateFrom3To4 } from './3_to_4'
import { migrateFrom4To5 } from './4_to_5'
import { migrateFrom5To6 } from './5_to_6'
import { migrateFrom6To7 } from './6_to_7'
import { migrateFrom7To8 } from './7_to_8'
import { migrateFrom8To9 } from './8_to_9'
import { migrateFrom9To10 } from './9_to_10'

export const SETTINGS_SCHEMA_VERSION = 10

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
  {
    fromVersion: 4,
    toVersion: 5,
    migrate: migrateFrom4To5,
  },
  {
    fromVersion: 5,
    toVersion: 6,
    migrate: migrateFrom5To6,
  },
  {
    fromVersion: 6,
    toVersion: 7,
    migrate: migrateFrom6To7,
  },
  {
    fromVersion: 7,
    toVersion: 8,
    migrate: migrateFrom7To8,
  },
  {
    fromVersion: 8,
    toVersion: 9,
    migrate: migrateFrom8To9,
  },
  {
    fromVersion: 9,
    toVersion: 10,
    migrate: migrateFrom9To10,
  },
]
