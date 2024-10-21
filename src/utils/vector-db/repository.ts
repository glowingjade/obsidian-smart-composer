import { PGlite } from '@electric-sql/pglite'
import {
  SQL,
  and,
  cosineDistance,
  desc,
  eq,
  getTableColumns,
  gt,
  inArray,
  like,
  or,
  sql,
} from 'drizzle-orm'
import { PgliteDatabase, drizzle } from 'drizzle-orm/pglite'
import { App } from 'obsidian'

import migrations from '../../db/migrations.json'
import { InsertVector, SelectVector, vectorTables } from '../../db/schema'

export class VectorDbRepository {
  private app: App
  private pgClient: PGlite | null = null
  private db: PgliteDatabase | null = null
  private dbPath: string

  constructor(app: App, dbPath: string) {
    this.app = app
    this.dbPath = dbPath
  }

  async initialize(): Promise<void> {
    this.db = await this.loadExistingDatabase()
    if (!this.db) {
      this.db = await this.createNewDatabase()
    }
    await this.migrateDatabase()
    await this.save()
    console.log('Smart composer database initialized.')
  }

  async getIndexedFilePaths(embeddingModel: {
    name: string
  }): Promise<string[]> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    const vectors = vectorTables[embeddingModel.name]
    const indexedFiles = await this.db
      .select({
        path: vectors.path,
      })
      .from(vectors)
    return indexedFiles.map((row) => row.path)
  }

  async getVectorsByFilePath(
    filePath: string,
    embeddingModel: { name: string },
  ): Promise<SelectVector[]> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    const vectors = vectorTables[embeddingModel.name]
    const fileVectors = await this.db
      .select()
      .from(vectors)
      .where(eq(vectors.path, filePath))
    return fileVectors
  }

  async deleteVectorsForSingleFile(
    filePath: string,
    embeddingModel: { name: string },
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    const vectors = vectorTables[embeddingModel.name]
    await this.db.delete(vectors).where(eq(vectors.path, filePath))
  }

  async deleteVectorsForMultipleFiles(
    filePaths: string[],
    embeddingModel: { name: string },
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    const vectors = vectorTables[embeddingModel.name]
    await this.db.delete(vectors).where(inArray(vectors.path, filePaths))
  }

  async clearAllVectors(embeddingModel: { name: string }): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    const vectors = vectorTables[embeddingModel.name]
    await this.db.delete(vectors)
  }

  async insertVectors(
    data: InsertVector[],
    embeddingModel: { name: string },
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    const vectors = vectorTables[embeddingModel.name]
    await this.db.insert(vectors).values(data)
  }

  async performSimilaritySearch(
    queryVector: number[],
    embeddingModel: { name: string },
    options: {
      minSimilarity: number
      limit: number
      scope?: {
        files: string[]
        folders: string[]
      }
    },
  ): Promise<
    (Omit<SelectVector, 'embedding'> & {
      similarity: number
    })[]
  > {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    const vectors = vectorTables[embeddingModel.name]

    const similarity = sql<number>`1 - (${cosineDistance(vectors.embedding, queryVector)})`
    const similarityCondition = gt(similarity, options.minSimilarity)

    const getScopeCondition = (): SQL | undefined => {
      if (!options.scope) {
        return undefined
      }
      const conditions: (SQL | undefined)[] = []
      if (options.scope.files.length > 0) {
        conditions.push(inArray(vectors.path, options.scope.files))
      }
      if (options.scope.folders.length > 0) {
        conditions.push(
          or(
            ...options.scope.folders.map((folder) =>
              like(vectors.path, `${folder}/%`),
            ),
          ),
        )
      }
      if (conditions.length === 0) {
        return undefined
      }
      return or(...conditions)
    }
    const scopeCondition = getScopeCondition()

    const similaritySearchResult = await this.db
      .select({
        ...(() => {
          const { embedding, ...rest } = getTableColumns(vectors)
          return rest
        })(),
        similarity,
      })
      .from(vectors)
      .where(and(similarityCondition, scopeCondition))
      .orderBy((t) => desc(t.similarity))
      .limit(options.limit)

    return similaritySearchResult
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
    // Workaround for running Drizzle migrations in a browser environment
    // This method uses an undocumented API to perform migrations
    // See: https://github.com/drizzle-team/drizzle-orm/discussions/2532#discussioncomment-10780523
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    await this.db.dialect.migrate(migrations, this.db.session, {
      migrationsTable: 'drizzle_migrations',
    })
  }

  private async loadPGliteResources(): Promise<{
    fsBundle: Blob
    wasmModule: WebAssembly.Module
    vectorExtensionBundlePath: URL
  }> {
    const [fsBundleResponse, wasmResponse] = await Promise.all([
      fetch('https://unpkg.com/@electric-sql/pglite/dist/postgres.data'),
      fetch('https://unpkg.com/@electric-sql/pglite/dist/postgres.wasm'),
    ])

    if (!fsBundleResponse.ok || !wasmResponse.ok) {
      throw new Error('Failed to fetch PGlite resources')
    }

    const [fsBundleArrayBuffer, wasmArrayBuffer] = await Promise.all([
      fsBundleResponse.arrayBuffer(),
      wasmResponse.arrayBuffer(),
    ])

    const fsBundle = new Blob([fsBundleArrayBuffer], {
      type: 'application/octet-stream',
    })
    const wasmModule = await WebAssembly.compile(wasmArrayBuffer)
    const vectorExtensionBundlePath = new URL(
      'https://unpkg.com/@electric-sql/pglite/dist/vector.tar.gz',
    )

    return { fsBundle, wasmModule, vectorExtensionBundlePath }
  }
}
