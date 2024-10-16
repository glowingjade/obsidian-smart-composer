import { PGlite } from '@electric-sql/pglite'
import { App } from 'obsidian'

import { EMBEDDING_MODEL_OPTIONS } from '../../constants'
import { VectorData } from '../../types/vector-db'

export class VectorDbRepository {
  private app: App
  private db: PGlite | null = null
  private dbPath: string

  constructor(app: App, dbPath: string) {
    this.app = app
    this.dbPath = dbPath
  }

  async initialize(): Promise<void> {
    this.db = await this.loadExistingDatabase()
    if (!this.db) {
      await this.initializeNewDatabase()
      await this.save()
    }
  }

  async getIndexedFilePaths(embeddingModel: {
    name: string
  }): Promise<string[]> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    const tableName = this.getTableName(embeddingModel)
    const query = `
      SELECT path
      FROM ${tableName}
    `
    const result = await this.db.query(query)
    return result.rows.map((row: { path: string }) => row.path)
  }

  async getFileChunks(
    filePath: string,
    embeddingModel: { name: string },
  ): Promise<VectorData[]> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    const tableName = this.getTableName(embeddingModel)
    const query = `
      SELECT path, mtime, content, embedding
      FROM ${tableName}
      WHERE path = $1
    `
    const result = await this.db.query(query, [filePath])
    return result.rows as VectorData[]
  }

  async deleteChunksByFilePath(
    filePath: string,
    embeddingModel: { name: string },
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    const tableName = this.getTableName(embeddingModel)
    const query = `
      DELETE FROM ${tableName}
      WHERE path = $1
    `
    await this.db.query(query, [filePath])
  }

  async deleteChunksByFilePaths(
    filePaths: string[],
    embeddingModel: { name: string },
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    const tableName = this.getTableName(embeddingModel)
    const query = `
      DELETE FROM ${tableName}
      WHERE path = ANY($1)
    `
    await this.db.query(query, [filePaths])
  }

  async clearAllVectors(embeddingModel: { name: string }): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    const tableName = this.getTableName(embeddingModel)
    const query = `
      DELETE FROM ${tableName}
    `
    await this.db.query(query)
  }

  async insertVectorData(
    data: VectorData[],
    embeddingModel: { name: string },
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    const tableName = this.getTableName(embeddingModel)

    await this.db.transaction(async (client) => {
      for (const item of data) {
        const insertQuery = `
          INSERT INTO ${tableName} (path, mtime, content, embedding)
          VALUES ($1, $2, $3, $4)
        `
        await client.query(insertQuery, [
          item.path,
          item.mtime,
          item.content,
          JSON.stringify(item.embedding),
        ])
      }
    })
  }

  async performSimilaritySearch(
    queryVector: number[],
    embeddingModel: { name: string },
    options: {
      minSimilarity: number
      limit: number
    },
  ): Promise<
    (Omit<VectorData, 'embedding'> & {
      similarity: number
    })[]
  > {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    const tableName = this.getTableName(embeddingModel)

    const query = `
      SELECT path, mtime, content, 1 - (embedding <=> $1) AS similarity
      FROM ${tableName}
      WHERE 1 - (embedding <=> $1) >= $2
      ORDER BY similarity DESC
      LIMIT $3
    `

    try {
      const result = await this.db.query(query, [
        JSON.stringify(queryVector),
        options.minSimilarity,
        options.limit,
      ])
      return result.rows as (Omit<VectorData, 'embedding'> & {
        similarity: number
      })[]
    } catch (error) {
      console.error('Error performing vector search:', error)
      throw error
    }
  }

  private async loadExistingDatabase(): Promise<PGlite | null> {
    try {
      const fileBuffer = await this.app.vault.adapter.readBinary(this.dbPath)
      const fileBlob = new Blob([fileBuffer], { type: 'application/x-gzip' })
      const { fsBundle, wasmModule, vectorExtensionBundlePath } =
        await this.loadPGliteResources()
      const db = await PGlite.create({
        loadDataDir: fileBlob,
        fsBundle: fsBundle,
        wasmModule: wasmModule,
        extensions: {
          vector: vectorExtensionBundlePath,
        },
      })
      return db as PGlite
    } catch (error) {
      console.error('Error loading database:', error)
      return null
    }
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

  private async initializeNewDatabase() {
    const { fsBundle, wasmModule, vectorExtensionBundlePath } =
      await this.loadPGliteResources()
    this.db = await PGlite.create({
      fsBundle: fsBundle,
      wasmModule: wasmModule,
      extensions: {
        vector: vectorExtensionBundlePath,
      },
    })
    await this.db.query('CREATE EXTENSION IF NOT EXISTS vector')
    for (const { name, dimension } of EMBEDDING_MODEL_OPTIONS) {
      await this.createVectorTable({ name, dimension })
    }
  }

  private async createVectorTable(embeddingModel: {
    name: string
    dimension: number
  }): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    const tableName = this.getTableName(embeddingModel)
    await this.db.query(
      `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id SERIAL PRIMARY KEY,
        path TEXT NOT NULL,
        mtime BIGINT NOT NULL,
        content TEXT NOT NULL,
        embedding vector($1) NOT NULL
      )
    `,
      [embeddingModel.dimension],
    )

    // TODO: Create HNSW index
  }

  async save(): Promise<void> {
    if (!this.db) {
      return
    }
    try {
      const blob: Blob = await this.db.dumpDataDir('gzip')
      await this.app.vault.adapter.writeBinary(
        this.dbPath,
        Buffer.from(await blob.arrayBuffer()),
      )
    } catch (error) {
      console.error('Error saving database:', error)
    }
  }

  private getTableName(embeddingModel: { name: string }): string {
    const sanitizedName = embeddingModel.name.replace(/[^a-zA-Z0-9]/g, '_')
    return `vector_data_${sanitizedName}`
  }
}
