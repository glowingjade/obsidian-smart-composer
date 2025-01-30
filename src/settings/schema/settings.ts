import { SETTING_MIGRATIONS } from './migrations'
import {
  SETTINGS_SCHEMA_VERSION,
  SmartCopilotSettings,
  smartCopilotSettingsSchema,
} from './setting.types'

function migrateSettings(
  data: Record<string, unknown>,
): Record<string, unknown> {
  let currentData = { ...data }
  const currentVersion = (currentData.version as number) ?? 0

  for (const migration of SETTING_MIGRATIONS) {
    if (
      currentVersion >= migration.fromVersion &&
      currentVersion < migration.toVersion &&
      migration.toVersion <= SETTINGS_SCHEMA_VERSION
    ) {
      console.log(
        `Migrating settings from ${migration.fromVersion} to ${migration.toVersion}`,
      )
      currentData = migration.migrate(currentData)
    }
  }

  return currentData
}

export function parseSmartCopilotSettings(data: unknown): SmartCopilotSettings {
  try {
    const migratedData = migrateSettings(data as Record<string, unknown>)
    return smartCopilotSettingsSchema.parse(migratedData)
  } catch (error) {
    console.warn('Invalid settings provided, using defaults:', error)
    return smartCopilotSettingsSchema.parse({})
  }
}
