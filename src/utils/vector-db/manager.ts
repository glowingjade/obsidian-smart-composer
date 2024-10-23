import { backOff } from 'exponential-backoff'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { App, TFile, normalizePath } from 'obsidian'
import pLimit from 'p-limit'

import { IndexProgress } from '../../components/chat-view/QueryProgress'
import { PGLITE_DB_PATH } from '../../constants'
import { InsertVector, SelectVector } from '../../db/schema'
import { EmbeddingModel } from '../../types/embedding'

import { VectorDbRepository } from './repository'

export class VectorDbManager {
  private app: App
  private repository: VectorDbRepository

  constructor(app: App) {
    this.app = app
  }

  static async create(app: App): Promise<VectorDbManager> {
    const manager = new VectorDbManager(app)
    const dbPath = normalizePath(PGLITE_DB_PATH)
    manager.repository = await VectorDbRepository.create(app, dbPath)
    return manager
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
    return await this.repository.performSimilaritySearch(
      queryVector,
      embeddingModel,
      options,
    )
  }

  async updateVaultIndex(
    embeddingModel: EmbeddingModel,
    options: {
      chunkSize: number
      reindexAll?: boolean
    },
    updateProgress?: (indexProgress: IndexProgress) => void,
  ): Promise<void> {
    let filesToIndex: TFile[]
    if (options.reindexAll) {
      filesToIndex = this.app.vault.getMarkdownFiles()
      await this.repository.clearAllVectors(embeddingModel)
    } else {
      await this.deleteVectorsForDeletedFiles(embeddingModel)
      filesToIndex = await this.getFilesToIndex(embeddingModel)
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

    const contentChunks: InsertVector[] = (
      await Promise.all(
        filesToIndex.map(async (file) => {
          const fileContent = await this.app.vault.cachedRead(file)
          const fileDocuments = await textSplitter.createDocuments([
            fileContent,
          ])
          return fileDocuments.map((chunk): InsertVector => {
            return {
              path: file.path,
              mtime: file.stat.mtime,
              content: chunk.pageContent,
              metadata: {
                startLine: chunk.metadata.loc.lines.from as number,
                endLine: chunk.metadata.loc.lines.to as number,
              },
            }
          })
        }),
      )
    ).flat()

    updateProgress?.({
      completedChunks: 0,
      totalChunks: contentChunks.length,
      totalFiles: filesToIndex.length,
    })

    const embeddingProgress = { completed: 0, inserted: 0 }
    const embeddingChunks: InsertVector[] = []
    const batchSize = 100
    const limit = pLimit(50)
    const tasks = contentChunks.map((chunk) =>
      limit(async () => {
        await backOff(
          async () => {
            const embedding = await embeddingModel.getEmbedding(chunk.content)
            const embeddedChunk = {
              path: chunk.path,
              mtime: chunk.mtime,
              content: chunk.content,
              embedding,
              metadata: chunk.metadata,
            }
            embeddingChunks.push(embeddedChunk)
            embeddingProgress.completed++
            updateProgress?.({
              completedChunks: embeddingProgress.completed,
              totalChunks: contentChunks.length,
              totalFiles: filesToIndex.length,
            })

            // Insert vectors in batches
            if (
              embeddingChunks.length >=
                embeddingProgress.inserted + batchSize ||
              embeddingChunks.length === contentChunks.length
            ) {
              await this.repository.insertVectors(
                embeddingChunks.slice(
                  embeddingProgress.inserted,
                  embeddingProgress.inserted + batchSize,
                ),
                embeddingModel,
              )
              embeddingProgress.inserted += batchSize
            }
          },
          {
            numOfAttempts: 5,
            startingDelay: 1000,
            timeMultiple: 1.5,
            jitter: 'full',
            retry: (error) => {
              console.error(error)
              const isRateLimitError =
                error.status === 429 &&
                error.message.toLowerCase().includes('rate limit')
              return !!isRateLimitError // retry only for rate limit errors
            },
          },
        )
      }),
    )

    try {
      await Promise.all(tasks)
    } catch (error) {
      console.error('Error embedding chunks:', error)
      throw error
    } finally {
      await this.repository.save()
    }
  }

  async deleteVectorsForDeletedFiles(embeddingModel: EmbeddingModel) {
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

  async getFilesToIndex(embeddingModel: EmbeddingModel): Promise<TFile[]> {
    const markdownFiles = this.app.vault.getMarkdownFiles()
    const filesToIndex = await Promise.all(
      markdownFiles.map(async (file) => {
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
}
