import { PGlite } from '@electric-sql/pglite'
import { PgliteDatabase, drizzle } from 'drizzle-orm/pglite'
import { App, normalizePath, requestUrl } from 'obsidian'

import { PGLITE_DB_PATH } from '../constants'

import { PGLiteAbortedException } from './exception'
import migrations from './migrations.json'
import { LegacyTemplateManager } from './modules/template/TemplateManager'
import { VectorManager } from './modules/vector/VectorManager'

export class DatabaseManager {
  private app: App
  private dbPath: string
  private pgClient: PGlite | null = null
  private db: PgliteDatabase | null = null
  // WeakMap to prevent circular references
  private static managers = new WeakMap<
    DatabaseManager,
    {
      templateManager?: LegacyTemplateManager
      vectorManager?: VectorManager
    }
  >()

  constructor(app: App, dbPath: string) {
    this.app = app
    this.dbPath = dbPath
  }

  static async create(app: App): Promise<DatabaseManager> {
    const dbManager = new DatabaseManager(app, normalizePath(PGLITE_DB_PATH))
    dbManager.db = await dbManager.loadExistingDatabase()
    if (!dbManager.db) {
      dbManager.db = await dbManager.createNewDatabase()
    }
    await dbManager.migrateDatabase()
    await dbManager.save()

    // WeakMap setup
    const managers = {
      vectorManager: new VectorManager(app, dbManager.db),
      templateManager: new LegacyTemplateManager(app, dbManager.db),
    }

    // save, vacuum callback setup
    const saveCallback = dbManager.save.bind(dbManager) as () => Promise<void>
    const vacuumCallback = dbManager.vacuum.bind(
      dbManager,
    ) as () => Promise<void>

    managers.vectorManager.setSaveCallback(saveCallback)
    managers.vectorManager.setVacuumCallback(vacuumCallback)
    managers.templateManager.setSaveCallback(saveCallback)
    managers.templateManager.setVacuumCallback(vacuumCallback)

    DatabaseManager.managers.set(dbManager, managers)

    console.log('Smart composer database initialized.', dbManager)

    return dbManager
  }

  getDb() {
    return this.db
  }

  getVectorManager(): VectorManager {
    const managers = DatabaseManager.managers.get(this) ?? {}
    if (!managers.vectorManager) {
      if (this.db) {
        managers.vectorManager = new VectorManager(this.app, this.db)
        DatabaseManager.managers.set(this, managers)
      } else {
        throw new Error('Database is not initialized')
      }
    }
    return managers.vectorManager
  }

  getTemplateManager(): LegacyTemplateManager {
    const managers = DatabaseManager.managers.get(this) ?? {}
    if (!managers.templateManager) {
      if (this.db) {
        managers.templateManager = new LegacyTemplateManager(this.app, this.db)
        DatabaseManager.managers.set(this, managers)
      } else {
        throw new Error('Database is not initialized')
      }
    }
    return managers.templateManager
  }

  // vacuum the database to release unused space
  async vacuum() {
    if (!this.pgClient) {
      return
    }
    await this.pgClient.query('VACUUM FULL;')
  }

  private async createNewDatabase() {
    try {
      const { fsBundle, wasmModule, vectorExtensionBundlePath } =
        await this.loadPGliteResources()
      this.pgClient = await PGlite.create({
        fsBundle: fsBundle,
        wasmModule: wasmModule,
        extensions: {
          vector: vectorExtensionBundlePath,
        },
      })
      const db = drizzle(this.pgClient)
      return db
    } catch (error) {
      console.log('createNewDatabase error', error)
      if (
        error instanceof Error &&
        error.message.includes(
          'Aborted(). Build with -sASSERTIONS for more info.',
        )
      ) {
        // This error occurs when using an outdated Obsidian installer version
        throw new PGLiteAbortedException()
      }
      throw error
    }
  }

  private async loadExistingDatabase(): Promise<PgliteDatabase | null> {
    try {
      const databaseFileExists = await this.app.vault.adapter.exists(
        this.dbPath,
      )
      if (!databaseFileExists) {
        return null
      }
      const fileBuffer = await this.app.vault.adapter.readBinary(this.dbPath)
      const fileBlob = new Blob([fileBuffer], { type: 'application/x-gzip' })
      const { fsBundle, wasmModule, vectorExtensionBundlePath } =
        await this.loadPGliteResources()
      this.pgClient = await PGlite.create({
        loadDataDir: fileBlob,
        fsBundle: fsBundle,
        wasmModule: wasmModule,
        extensions: {
          vector: vectorExtensionBundlePath,
        },
      })
      return drizzle(this.pgClient)
    } catch (error) {
      console.log('loadExistingDatabase error', error)
      if (
        error instanceof Error &&
        error.message.includes(
          'Aborted(). Build with -sASSERTIONS for more info.',
        )
      ) {
        // This error occurs when using an outdated Obsidian installer version
        throw new PGLiteAbortedException()
      }
      return null
    }
  }

  private async migrateDatabase(): Promise<void> {
    try {
      // Workaround for running Drizzle migrations in a browser environment
      // This method uses an undocumented API to perform migrations
      // See: https://github.com/drizzle-team/drizzle-orm/discussions/2532#discussioncomment-10780523
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      await this.db.dialect.migrate(migrations, this.db.session, {
        migrationsTable: 'drizzle_migrations',
      })
    } catch (error) {
      console.error('Error migrating database:', error)
      throw error
    }
  }

  async save(): Promise<void> {
    if (!this.pgClient) {
      return
    }
    try {
      const blob: Blob = await this.pgClient.dumpDataDir('gzip')
      await this.app.vault.adapter.writeBinary(
        this.dbPath,
        Buffer.from(await blob.arrayBuffer()),
      )
    } catch (error) {
      console.error('Error saving database:', error)
    }
  }

  async cleanup() {
    // save before cleanup
    await this.save()
    // WeakMap cleanup
    DatabaseManager.managers.delete(this)
    await this.pgClient?.close()
    this.pgClient = null
    this.db = null
  }

  // TODO: This function is a temporary workaround chosen due to the difficulty of bundling postgres.wasm and postgres.data from node_modules into a single JS file. The ultimate goal is to bundle everything into one JS file in the future.
  private async loadPGliteResources(): Promise<{
    fsBundle: Blob
    wasmModule: WebAssembly.Module
    vectorExtensionBundlePath: URL
  }> {
    try {
      const PGLITE_VERSION = '0.2.12'
      const [fsBundleResponse, wasmResponse] = await Promise.all([
        requestUrl(
          `https://unpkg.com/@electric-sql/pglite@${PGLITE_VERSION}/dist/postgres.data`,
        ),
        requestUrl(
          `https://unpkg.com/@electric-sql/pglite@${PGLITE_VERSION}/dist/postgres.wasm`,
        ),
      ])

      const fsBundle = new Blob([fsBundleResponse.arrayBuffer], {
        type: 'application/octet-stream',
      })
      const wasmModule = await WebAssembly.compile(wasmResponse.arrayBuffer)
      const vectorExtensionBundlePath = new URL(
        `https://unpkg.com/@electric-sql/pglite@${PGLITE_VERSION}/dist/vector.tar.gz`,
      )

      return { fsBundle, wasmModule, vectorExtensionBundlePath }
    } catch (error) {
      console.error('Error loading PGlite resources:', error)
      throw error
    }
  }
}
