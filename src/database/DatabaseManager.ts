import { PGlite } from '@electric-sql/pglite'
import { PgliteDatabase, drizzle } from 'drizzle-orm/pglite'
import { App, normalizePath, requestUrl } from 'obsidian'

import { PGLITE_DB_PATH } from '../constants'

import migrations from './migrations.json'
import { TemplateManager } from './modules/template/TemplateManager'
import { VectorManager } from './modules/vector/VectorManager'

export class DatabaseManager {
  private app: App
  private dbPath: string
  private pgClient: PGlite | null = null
  private db: PgliteDatabase | null = null
  private vectorManager: VectorManager
  private templateManager: TemplateManager

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

    dbManager.vectorManager = new VectorManager(app, dbManager)
    dbManager.templateManager = new TemplateManager(app, dbManager)

    console.log('Smart composer database initialized.', dbManager)

    return dbManager
  }

  getDb() {
    return this.db
  }

  getVectorManager() {
    return this.vectorManager
  }

  getTemplateManager() {
    return this.templateManager
  }

  // vacuum the database to release unused space
  async vacuum() {
    if (!this.pgClient) {
      return
    }
    await this.pgClient.query('VACUUM FULL;')
  }

  private async createNewDatabase() {
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
      console.error('Error loading database:', error)
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
    this.pgClient?.close()
    this.db = null
    this.pgClient = null
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
