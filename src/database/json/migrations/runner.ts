import { App, normalizePath } from 'obsidian'

import SmartCopilotPlugin from '../../../main'
import { DB_ROOT, MIGRATIONS, MIGRATIONS_FILE } from '../constants'

import { Migration, MigrationLog } from './types'

export class MigrationRunner {
  private plugin: SmartCopilotPlugin
  private app: App
  private migrationsPath: string
  private migrations: Migration[]

  constructor(plugin: SmartCopilotPlugin) {
    this.plugin = plugin
    this.app = plugin.app
    this.migrationsPath = normalizePath(`${DB_ROOT}/${MIGRATIONS_FILE}`)
    this.migrations = MIGRATIONS
  }

  async run(): Promise<void> {
    await this.ensureJsonDbExists()
    const { appliedMigrations } = await this.readMigrationLog()

    for (const migration of this.migrations) {
      if (
        appliedMigrations.some(
          (appliedMigration) => appliedMigration.id === migration.id,
        )
      ) {
        continue
      }

      try {
        await migration.up({
          app: this.app,
          plugin: this.plugin,
        })
        await this.recordMigration(migration)
        console.log(`Successfully completed migration: ${migration.id}`)
      } catch (error) {
        console.error(`Failed to run migration ${migration.id}:`, error)
        throw error
      }
    }
  }

  private async readMigrationLog(): Promise<MigrationLog> {
    if (await this.app.vault.adapter.exists(this.migrationsPath)) {
      const content = await this.app.vault.adapter.read(this.migrationsPath)
      try {
        return JSON.parse(content) as MigrationLog
      } catch (parseError) {
        console.error('Failed to parse migrations file:', parseError)
        return { appliedMigrations: [] }
      }
    }
    return { appliedMigrations: [] }
  }

  private async recordMigration(migration: Migration): Promise<void> {
    const migrationLog = await this.readMigrationLog()
    migrationLog.appliedMigrations.push({
      id: migration.id,
      appliedAt: new Date().toISOString(),
    })
    await this.app.vault.adapter.write(
      this.migrationsPath,
      JSON.stringify(migrationLog),
    )
  }

  private async ensureJsonDbExists(): Promise<void> {
    const jsonDbPath = normalizePath(DB_ROOT)
    if (!(await this.app.vault.adapter.exists(jsonDbPath))) {
      await this.app.vault.createFolder(jsonDbPath)
    }
  }
}
