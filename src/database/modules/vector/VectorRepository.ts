import {
  SQL,
  and,
  cosineDistance,
  count,
  desc,
  eq,
  getTableColumns,
  gt,
  inArray,
  like,
  or,
  sql,
  sum,
} from 'drizzle-orm'
import { PgliteDatabase } from 'drizzle-orm/pglite'
import { App } from 'obsidian'

import {
  EmbeddingDbStats,
  EmbeddingModelClient,
} from '../../../types/embedding'
import { DatabaseNotInitializedException } from '../../exception'
import { InsertEmbedding, SelectEmbedding, embeddingTable } from '../../schema'

export class VectorRepository {
  private app: App
  private db: PgliteDatabase | null

  constructor(app: App, db: PgliteDatabase | null) {
    this.app = app
    this.db = db
  }

  async getIndexedFilePaths(
    embeddingModel: EmbeddingModelClient,
  ): Promise<string[]> {
    if (!this.db) {
      throw new DatabaseNotInitializedException()
    }
    const indexedFiles = await this.db
      .select({
        path: embeddingTable.path,
      })
      .from(embeddingTable)
      .where(eq(embeddingTable.model, embeddingModel.id))
    return indexedFiles.map((row) => row.path)
  }

  async getVectorsByFilePath(
    filePath: string,
    embeddingModel: EmbeddingModelClient,
  ): Promise<SelectEmbedding[]> {
    if (!this.db) {
      throw new DatabaseNotInitializedException()
    }
    const fileVectors = await this.db
      .select()
      .from(embeddingTable)
      .where(
        and(
          eq(embeddingTable.path, filePath),
          eq(embeddingTable.model, embeddingModel.id),
        ),
      )
    return fileVectors
  }

  async deleteVectorsForSingleFile(
    filePath: string,
    embeddingModel: EmbeddingModelClient,
  ): Promise<void> {
    if (!this.db) {
      throw new DatabaseNotInitializedException()
    }
    await this.db
      .delete(embeddingTable)
      .where(
        and(
          eq(embeddingTable.path, filePath),
          eq(embeddingTable.model, embeddingModel.id),
        ),
      )
  }

  async deleteVectorsForMultipleFiles(
    filePaths: string[],
    embeddingModel: EmbeddingModelClient,
  ): Promise<void> {
    if (!this.db) {
      throw new DatabaseNotInitializedException()
    }
    await this.db
      .delete(embeddingTable)
      .where(
        and(
          inArray(embeddingTable.path, filePaths),
          eq(embeddingTable.model, embeddingModel.id),
        ),
      )
  }

  async clearAllVectors(embeddingModel: EmbeddingModelClient): Promise<void> {
    if (!this.db) {
      throw new DatabaseNotInitializedException()
    }
    await this.db
      .delete(embeddingTable)
      .where(eq(embeddingTable.model, embeddingModel.id))
  }

  async insertVectors(data: InsertEmbedding[]): Promise<void> {
    if (!this.db) {
      throw new DatabaseNotInitializedException()
    }
    await this.db.insert(embeddingTable).values(data)
  }

  async performSimilaritySearch(
    queryVector: number[],
    embeddingModel: EmbeddingModelClient,
    options: {
      minSimilarity: number
      limit: number
      scope?: {
        files: string[]
        folders: string[]
      }
    },
  ): Promise<
    (Omit<SelectEmbedding, 'embedding'> & {
      similarity: number
    })[]
  > {
    if (!this.db) {
      throw new DatabaseNotInitializedException()
    }
    const similarity = sql<number>`1 - (${cosineDistance(embeddingTable.embedding, queryVector)})`
    const similarityCondition = gt(similarity, options.minSimilarity)

    const getScopeCondition = (): SQL | undefined => {
      if (!options.scope) {
        return undefined
      }
      const conditions: (SQL | undefined)[] = []
      if (options.scope.files.length > 0) {
        conditions.push(inArray(embeddingTable.path, options.scope.files))
      }
      if (options.scope.folders.length > 0) {
        conditions.push(
          or(
            ...options.scope.folders.map((folder) =>
              like(embeddingTable.path, `${folder}/%`),
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

    const similaritySearchResults = await this.db
      .select({
        ...(() => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { embedding, ...rest } = getTableColumns(embeddingTable)
          return rest
        })(),
        similarity,
      })
      .from(embeddingTable)
      .where(
        and(
          similarityCondition,
          scopeCondition,
          eq(embeddingTable.model, embeddingModel.id),
          eq(embeddingTable.dimension, embeddingModel.dimension), // include this to fully utilize partial index
        ),
      )
      .orderBy((t) => desc(t.similarity))
      .limit(options.limit)

    return similaritySearchResults
  }

  async getEmbeddingStats(): Promise<EmbeddingDbStats[]> {
    if (!this.db) {
      throw new DatabaseNotInitializedException()
    }

    const stats = await this.db
      .select({
        model: embeddingTable.model,
        rowCount: count(),
        totalDataBytes: sum(sql`pg_column_size(${embeddingTable}.*)`).mapWith(
          Number,
        ),
      })
      .from(embeddingTable)
      .groupBy(embeddingTable.model)
      .orderBy(embeddingTable.model)

    return stats
  }
}
