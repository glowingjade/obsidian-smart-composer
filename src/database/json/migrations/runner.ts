import { App, normalizePath } from 'obsidian'

import { DB_ROOT, MIGRATIONS, MIGRATIONS_FILE } from '../constants'

import { Migration, MigrationLog } from './types'

export class MigrationRunner {
  private app: App
  private migrationsPath: string
  private migrations: Migration[]

  constructor(app: App) {
    this.app = app
    this.migrationsPath = normalizePath(`${DB_ROOT}/${MIGRATIONS_FILE}`)
    this.migrations = MIGRATIONS
  }

  async run(): Promise<void> {
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
        await migration.up(this.app)
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
}
