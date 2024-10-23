import { App } from 'obsidian'

import { QueryProgressState } from '../components/chat-view/QueryProgress'
import { SelectVector } from '../db/schema'
import { EmbeddingModel } from '../types/embedding'
import { SmartCopilotSettings } from '../types/settings'

import { getEmbeddingModel } from './embedding'
import { VectorDbManager } from './vector-db/manager'

export class RAGEngine {
  private app: App
  private settings: SmartCopilotSettings
  private vectorDbManager: VectorDbManager
  private embeddingModel: EmbeddingModel | null = null

  constructor(app: App, settings: SmartCopilotSettings) {
    this.app = app
    this.settings = settings
  }

  static async create(
    app: App,
    settings: SmartCopilotSettings,
  ): Promise<RAGEngine> {
    const ragEngine = new RAGEngine(app, settings)
    ragEngine.vectorDbManager = await VectorDbManager.create(app)
    ragEngine.embeddingModel = getEmbeddingModel(settings.embeddingModel, {
      openAIApiKey: settings.openAIApiKey,
    })
    return ragEngine
  }

  setSettings(settings: SmartCopilotSettings) {
    this.settings = settings
    this.embeddingModel = getEmbeddingModel(settings.embeddingModel, {
      openAIApiKey: settings.openAIApiKey,
    })
  }

  // TODO: Implement automatic vault re-indexing when settings are changed.
  // Currently, users must manually re-index the vault.
  async updateVaultIndex(
    options: { reindexAll: boolean } = {
      reindexAll: false,
    },
    onQueryProgressChange?: (queryProgress: QueryProgressState) => void,
  ): Promise<void> {
    if (!this.embeddingModel) {
      throw new Error('Embedding model is not set')
    }
    await this.vectorDbManager.updateVaultIndex(
      this.embeddingModel,
      {
        chunkSize: this.settings.ragOptions.chunkSize,
        reindexAll: options.reindexAll,
      },
      (indexProgress) => {
        onQueryProgressChange?.({
          type: 'indexing',
          indexProgress,
        })
      },
    )
  }

  async processQuery({
    query,
    scope,
    onQueryProgressChange,
  }: {
    query: string
    scope?: {
      files: string[]
      folders: string[]
    }
    onQueryProgressChange?: (queryProgress: QueryProgressState) => void
  }): Promise<
    (Omit<SelectVector, 'embedding'> & {
      similarity: number
    })[]
  > {
    if (!this.embeddingModel) {
      throw new Error('Embedding model is not set')
    }
    // TODO: Decide the vault index update strategy.
    // Current approach: Update on every query.
    await this.updateVaultIndex({ reindexAll: false }, onQueryProgressChange)
    const queryEmbedding = await this.getQueryEmbedding(query)
    onQueryProgressChange?.({
      type: 'querying',
    })
    const queryResult = await this.vectorDbManager.performSimilaritySearch(
      queryEmbedding,
      this.embeddingModel,
      {
        minSimilarity: this.settings.ragOptions.minSimilarity,
        limit: this.settings.ragOptions.limit,
        scope,
      },
    )
    onQueryProgressChange?.({
      type: 'querying-done',
      queryResult,
    })
    return queryResult
  }

  private async getQueryEmbedding(query: string): Promise<number[]> {
    if (!this.embeddingModel) {
      throw new Error('Embedding model is not set')
    }
    return this.embeddingModel.getEmbedding(query)
  }
}
