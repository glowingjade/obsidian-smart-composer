import { backOff } from 'exponential-backoff'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { minimatch } from 'minimatch'
import { App, Notice, TFile } from 'obsidian'

import { IndexProgress } from '../../../components/chat-view/QueryProgress'
import {
  LLMAPIKeyInvalidException,
  LLMAPIKeyNotSetException,
  LLMBaseUrlNotSetException,
  LLMRateLimitExceededException,
} from '../../../core/llm/exception'
import { InsertEmbedding, SelectEmbedding } from '../../../database/schema'
import { ReportBugModal } from '../../../settings/ReportBugModal'
import {
  EmbeddingDbStats,
  EmbeddingModelClient,
} from '../../../types/embedding'
import { chunkArray } from '../../../utils/chunk-array'
import { openSettingsModalWithError } from '../../../utils/openSettingsModal'
import { DatabaseManager } from '../../DatabaseManager'

import { VectorRepository } from './VectorRepository'

export class VectorManager {
  private app: App
  private repository: VectorRepository
  private dbManager: DatabaseManager

  constructor(app: App, dbManager: DatabaseManager) {
    this.app = app
    this.dbManager = dbManager
    this.repository = new VectorRepository(app, dbManager.getDb())
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
    return await this.repository.performSimilaritySearch(
      queryVector,
      embeddingModel,
      options,
    )
  }

  async updateVaultIndex(
    embeddingModel: EmbeddingModelClient,
    options: {
      chunkSize: number
      excludePatterns: string[]
      includePatterns: string[]
      reindexAll?: boolean
    },
    updateProgress?: (indexProgress: IndexProgress) => void,
  ): Promise<void> {
    let filesToIndex: TFile[]
    if (options.reindexAll) {
      filesToIndex = await this.getFilesToIndex({
        embeddingModel: embeddingModel,
        excludePatterns: options.excludePatterns,
        includePatterns: options.includePatterns,
        reindexAll: true,
      })
      await this.repository.clearAllVectors(embeddingModel)
    } else {
      await this.deleteVectorsForDeletedFiles(embeddingModel)
      filesToIndex = await this.getFilesToIndex({
        embeddingModel: embeddingModel,
        excludePatterns: options.excludePatterns,
        includePatterns: options.includePatterns,
      })
      await this.repository.deleteVectorsForMultipleFiles(
        filesToIndex.map((file) => file.path),
        embeddingModel,
      )
    }

    if (filesToIndex.length === 0) {
      return
    }

    const textSplitter = RecursiveCharacterTextSplitter.fromLanguage(
      'markdown',
      {
        chunkSize: options.chunkSize,
        // TODO: Use token-based chunking after migrating to WebAssembly-based tiktoken
        // Current token counting method is too slow for practical use
        // lengthFunction: async (text) => {
        //   return await tokenCount(text)
        // },
      },
    )

    const contentChunks = (
      await Promise.all(
        filesToIndex.map(async (file) => {
          try {
            const fileContent = await this.app.vault.cachedRead(file)
            // Remove null bytes from the content
            // eslint-disable-next-line no-control-regex
            const sanitizedContent = fileContent.replace(/\x00/g, '')

            const fileDocuments = await textSplitter.createDocuments([
              sanitizedContent,
            ])
            return fileDocuments.map(
              (chunk): Omit<InsertEmbedding, 'model' | 'dimension'> => {
                return {
                  path: file.path,
                  mtime: file.stat.mtime,
                  content: chunk.pageContent,
                  metadata: {
                    startLine: chunk.metadata.loc.lines.from as number,
                    endLine: chunk.metadata.loc.lines.to as number,
                  },
                }
              },
            )
          } catch (error) {
            new ReportBugModal(
              this.app,
              'Error: chunk embedding failed',
              `Please report this issue to the developer.

Error details:
- File: ${file.path}
- Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            ).open()

            throw error
          }
        }),
      )
    ).flat()

    updateProgress?.({
      completedChunks: 0,
      totalChunks: contentChunks.length,
      totalFiles: filesToIndex.length,
    })

    let completedChunks = 0
    const batchChunks = chunkArray(contentChunks, 100)

    try {
      for (const batchChunk of batchChunks) {
        const embeddingChunks: InsertEmbedding[] = await Promise.all(
          batchChunk.map(async (chunk) => {
            try {
              return await backOff(
                async () => {
                  if (chunk.content.length === 0) {
                    throw new Error(
                      `Chunk content is empty in file: ${chunk.path}`,
                    )
                  }
                  if (chunk.content.includes('\x00')) {
                    // this should never happen because we remove null bytes from the content
                    throw new Error(
                      `Chunk content contains null bytes in file: ${chunk.path}`,
                    )
                  }

                  const embedding = await embeddingModel.getEmbedding(
                    chunk.content,
                  )
                  completedChunks += 1

                  updateProgress?.({
                    completedChunks,
                    totalChunks: contentChunks.length,
                    totalFiles: filesToIndex.length,
                  })

                  return {
                    path: chunk.path,
                    mtime: chunk.mtime,
                    content: chunk.content,
                    model: embeddingModel.id,
                    dimension: embeddingModel.dimension,
                    embedding,
                    metadata: chunk.metadata,
                  }
                },
                {
                  numOfAttempts: 5,
                  startingDelay: 1000,
                  timeMultiple: 1.5,
                  jitter: 'full',
                },
              )
            } catch (error) {
              new ReportBugModal(
                this.app,
                'Error: chunk embedding failed',
                `Please report this issue to the developer.

Error details:
- File: ${chunk.path}
- Metadata: ${JSON.stringify(chunk.metadata)}
- Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              ).open()

              throw error
            }
          }),
        )

        await this.repository.insertVectors(embeddingChunks)
      }
    } catch (error) {
      if (
        error instanceof LLMAPIKeyNotSetException ||
        error instanceof LLMAPIKeyInvalidException ||
        error instanceof LLMBaseUrlNotSetException
      ) {
        openSettingsModalWithError(this.app, (error as Error).message)
      } else if (error instanceof LLMRateLimitExceededException) {
        new Notice(error.message)
      } else {
        console.error('Error embedding chunks:', error)
        throw error
      }
    } finally {
      await this.dbManager.save()
    }
  }

  async clearAllVectors(embeddingModel: EmbeddingModelClient) {
    await this.repository.clearAllVectors(embeddingModel)
    await this.dbManager.vacuum()
    await this.dbManager.save()
  }

  private async deleteVectorsForDeletedFiles(
    embeddingModel: EmbeddingModelClient,
  ) {
    const indexedFilePaths =
      await this.repository.getIndexedFilePaths(embeddingModel)
    for (const filePath of indexedFilePaths) {
      if (!this.app.vault.getAbstractFileByPath(filePath)) {
        await this.repository.deleteVectorsForMultipleFiles(
          [filePath],
          embeddingModel,
        )
      }
    }
  }

  private async getFilesToIndex({
    embeddingModel,
    excludePatterns,
    includePatterns,
    reindexAll,
  }: {
    embeddingModel: EmbeddingModelClient
    excludePatterns: string[]
    includePatterns: string[]
    reindexAll?: boolean
  }): Promise<TFile[]> {
    let filesToIndex = this.app.vault.getMarkdownFiles()

    filesToIndex = filesToIndex.filter((file) => {
      return !excludePatterns.some((pattern) => minimatch(file.path, pattern))
    })

    if (includePatterns.length > 0) {
      filesToIndex = filesToIndex.filter((file) => {
        return includePatterns.some((pattern) => minimatch(file.path, pattern))
      })
    }

    if (reindexAll) {
      return filesToIndex
    }

    // Check for updated or new files
    filesToIndex = await Promise.all(
      filesToIndex.map(async (file) => {
        // TODO: Query all rows at once and compare them to enhance performance
        const fileChunks = await this.repository.getVectorsByFilePath(
          file.path,
          embeddingModel,
        )
        if (fileChunks.length === 0) {
          // File is not indexed, so we need to index it
          const fileContent = await this.app.vault.cachedRead(file)
          if (fileContent.length === 0) {
            // Ignore empty files
            return null
          }
          return file
        }
        const outOfDate = file.stat.mtime > fileChunks[0].mtime
        if (outOfDate) {
          // File has changed, so we need to re-index it
          return file
        }
        return null
      }),
    ).then((files) => files.filter(Boolean) as TFile[])

    return filesToIndex
  }

  async getEmbeddingStats(): Promise<EmbeddingDbStats[]> {
    return await this.repository.getEmbeddingStats()
  }
}
