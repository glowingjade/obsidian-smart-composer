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
import { PgliteDatabase } from 'drizzle-orm/pglite'
import { App } from 'obsidian'

import { EmbeddingModel } from '../../../types/embedding'
import { DatabaseNotInitializedException } from '../../exception'
import { InsertVector, SelectVector, vectorTables } from '../../schema'

export class VectorRepository {
  private app: App
  private db: PgliteDatabase | null

  constructor(app: App, db: PgliteDatabase | null) {
    this.app = app
    this.db = db
  }

  async getIndexedFilePaths(embeddingModel: EmbeddingModel): Promise<string[]> {
    if (!this.db) {
      throw new DatabaseNotInitializedException()
    }
    const vectors = vectorTables[embeddingModel.id]
    const indexedFiles = await this.db
      .select({
        path: vectors.path,
      })
      .from(vectors)
    return indexedFiles.map((row) => row.path)
  }

  async getVectorsByFilePath(
    filePath: string,
    embeddingModel: EmbeddingModel,
  ): Promise<SelectVector[]> {
    if (!this.db) {
      throw new DatabaseNotInitializedException()
    }
    const vectors = vectorTables[embeddingModel.id]
    const fileVectors = await this.db
      .select()
      .from(vectors)
      .where(eq(vectors.path, filePath))
    return fileVectors
  }

  async deleteVectorsForSingleFile(
    filePath: string,
    embeddingModel: EmbeddingModel,
  ): Promise<void> {
    if (!this.db) {
      throw new DatabaseNotInitializedException()
    }
    const vectors = vectorTables[embeddingModel.id]
    await this.db.delete(vectors).where(eq(vectors.path, filePath))
  }

  async deleteVectorsForMultipleFiles(
    filePaths: string[],
    embeddingModel: EmbeddingModel,
  ): Promise<void> {
    if (!this.db) {
      throw new DatabaseNotInitializedException()
    }
    const vectors = vectorTables[embeddingModel.id]
    await this.db.delete(vectors).where(inArray(vectors.path, filePaths))
  }

  async clearAllVectors(embeddingModel: EmbeddingModel): Promise<void> {
    if (!this.db) {
      throw new DatabaseNotInitializedException()
    }
    const vectors = vectorTables[embeddingModel.id]
    await this.db.delete(vectors)
  }

  async insertVectors(
    data: InsertVector[],
    embeddingModel: EmbeddingModel,
  ): Promise<void> {
    if (!this.db) {
      throw new DatabaseNotInitializedException()
    }
    const vectors = vectorTables[embeddingModel.id]
    await this.db.insert(vectors).values(data)
  }

  async performSimilaritySearch(
    queryVector: number[],
    embeddingModel: EmbeddingModel,
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
      throw new DatabaseNotInitializedException()
    }
    const vectors = vectorTables[embeddingModel.id]

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
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
}
