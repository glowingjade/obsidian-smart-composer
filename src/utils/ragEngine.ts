import { App } from 'obsidian'

import { EmbeddingModel } from '../types/embedding'
import { SmartCopilotSettings } from '../types/settings'
import { VectorData } from '../types/vector-db'

import { VectorDbManager } from './vector-db/manager'

export class RAGEngine {
  private settings: SmartCopilotSettings
  private vectorDbManager: VectorDbManager
  private embeddingModel: EmbeddingModel | null = null

  constructor(app: App, settings: SmartCopilotSettings) {
    this.settings = settings
    this.vectorDbManager = new VectorDbManager(app)
  }

  async initialize(embeddingModel: EmbeddingModel): Promise<void> {
    await this.vectorDbManager.initialize()
    this.setEmbeddingModel(embeddingModel)
  }

  setEmbeddingModel(embeddingModel: EmbeddingModel) {
    this.embeddingModel = embeddingModel
  }

  setSettings(settings: SmartCopilotSettings) {
    this.settings = settings
  }

  async updateVaultIndex(overwrite = false): Promise<void> {
    if (!this.embeddingModel) {
      throw new Error('Embedding model is not set')
    }
    await this.vectorDbManager.updateVaultIndex(
      this.embeddingModel,
      {
        chunkSize: this.settings.chunkOptions.chunkSize,
      },
      overwrite,
    )
  }

  async processQuery(query: string): Promise<
    (Omit<VectorData, 'embedding'> & {
      similarity: number
    })[]
  > {
    if (!this.embeddingModel) {
      throw new Error('Embedding model is not set')
    }
    await this.updateVaultIndex() // FIXME: Checking the index every time is not efficient.
    const queryEmbedding = await this.getQueryEmbedding(query)
    return await this.vectorDbManager.performSimilaritySearch(
      queryEmbedding,
      this.embeddingModel,
      {
        minSimilarity: this.settings.ragOptions.minSimilarity,
        limit: this.settings.ragOptions.limit,
      },
    )
  }

  private async getQueryEmbedding(query: string): Promise<number[]> {
    if (!this.embeddingModel) {
      throw new Error('Embedding model is not set')
    }
    return this.embeddingModel.getEmbedding(query)
  }
}
