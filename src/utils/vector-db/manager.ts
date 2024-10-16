import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { App, TFile, normalizePath } from 'obsidian'

import { PGLITE_DB_PATH } from '../../constants'
import { EmbeddingModel } from '../../types/embedding'
import { VectorData } from '../../types/vector-db'

import { VectorDbRepository } from './repository'

export class VectorDbManager {
  private repository: VectorDbRepository

  constructor(private app: App) {
    const dbPath = normalizePath(PGLITE_DB_PATH)
    this.repository = new VectorDbRepository(app, dbPath)
  }

  async initialize(): Promise<void> {
    await this.repository.initialize()
  }

  async performSimilaritySearch(
    queryVector: number[],
    embeddingModel: EmbeddingModel,
    options: {
      minSimilarity: number
      limit: number
    },
  ): Promise<
    (Omit<VectorData, 'embedding'> & {
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
    },
    overwrite = false,
  ): Promise<void> {
    let filesToIndex: TFile[]
    if (overwrite) {
      filesToIndex = this.app.vault.getMarkdownFiles()
      await this.repository.clearAllVectors(embeddingModel)
    } else {
      const indexedFilePaths =
        await this.repository.getIndexedFilePaths(embeddingModel)
      for (const filePath of indexedFilePaths) {
        if (!this.app.vault.getAbstractFileByPath(filePath)) {
          await this.repository.deleteChunksByFilePaths(
            [filePath],
            embeddingModel,
          )
        }
      }
      filesToIndex = this.app.vault.getMarkdownFiles().filter(async (file) => {
        const fileChunks = await this.repository.getFileChunks(
          file.path,
          embeddingModel,
        )
        if (fileChunks.length === 0) return true
        return file.stat.mtime > fileChunks[0].mtime
      })
      await this.repository.deleteChunksByFilePaths(
        filesToIndex.map((file) => file.path),
        embeddingModel,
      )
    }

    filesToIndex = filesToIndex.slice(0, 30)
    console.log(`Updating vault index for ${filesToIndex.length} files.`)
    await Promise.all(
      filesToIndex.map(async (file) => {
        const embeddedChunks = await this.generateEmbeddingsForFile(
          file,
          embeddingModel,
          {
            chunkSize: options.chunkSize,
          },
        )
        await this.repository.insertVectorData(embeddedChunks, embeddingModel)
      }),
    )
    await this.repository.save()
    console.log('Vault index updated.')
  }

  private async generateEmbeddingsForFile(
    file: TFile,
    embeddingModel: EmbeddingModel,
    options: {
      chunkSize: number
    },
  ): Promise<VectorData[]> {
    const textSplitter = RecursiveCharacterTextSplitter.fromLanguage(
      'markdown',
      {
        chunkSize: options.chunkSize,
        // TODO: Use token count for length function
      },
    )

    const fileContent = await this.app.vault.cachedRead(file)
    const contentChunks = await textSplitter.createDocuments([fileContent])

    const embeddedChunks: VectorData[] = await Promise.all(
      contentChunks.map(async (chunk) => {
        const embedding = await embeddingModel.getEmbedding(chunk.pageContent)
        return {
          path: file.path,
          mtime: file.stat.mtime,
          content: chunk.pageContent,
          embedding,
        }
      }),
    )
    return embeddedChunks
  }
}
