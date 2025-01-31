import { App } from 'obsidian'

import SmartCopilotPlugin from '../../../main'

export type Migration = {
  /** Unique ID of the migration. Should match the filename or a logical ID. */
  id: string
  /** Optional description of what this migration does. */
  description?: string

  /**
   * The "up" method applies the migration: reads from the JSON files,
   * modifies them, and writes back to disk.
   */
  up(params: { app: App; plugin: SmartCopilotPlugin }): Promise<void> | void
}

export type MigrationLogEntry = {
  id: string
  appliedAt: string
}

export type MigrationLog = {
  appliedMigrations: MigrationLogEntry[]
}
