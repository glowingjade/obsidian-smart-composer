import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

import { EmbeddingModel } from '../types/embedding'
import { VectorData } from '../types/vector-db'
import { getEmbeddingModel } from '../utils/embedding'
import { RAGEngine } from '../utils/ragEngine'

import { useApp } from './app-context'
import { useSettings } from './settings-context'

type RAGContextType = {
  processQuery: (query: string) => Promise<
    (Omit<VectorData, 'embedding'> & {
      similarity: number
    })[]
  >
  updateVaultIndex: (overwrite?: boolean) => Promise<void>
}

const RAGContext = createContext<RAGContextType | null>(null)

export function RAGProvider({ children }: PropsWithChildren) {
  const app = useApp()
  const { settings } = useSettings()

  const [ragEngine, setRAGEngine] = useState<RAGEngine | null>(null)
  const [embeddingModel, setEmbeddingModel] = useState<EmbeddingModel | null>(
    null,
  )

  useEffect(() => {
    const initializeRAGEngine = async () => {
      const engine = new RAGEngine(app, settings)
      setRAGEngine(engine)
      const embeddingModel = getEmbeddingModel(settings.embeddingModel, {
        openAIApiKey: settings.openAIApiKey,
      })
      await engine.initialize(embeddingModel)
    }
    void initializeRAGEngine()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app])

  useEffect(() => {
    ragEngine?.setSettings(settings)
  }, [ragEngine, settings])

  useEffect(() => {
    if (!ragEngine || !embeddingModel) {
      return
    }
    ragEngine.setEmbeddingModel(embeddingModel)
  }, [ragEngine, embeddingModel])

  useEffect(() => {
    setEmbeddingModel(
      getEmbeddingModel(settings.embeddingModel, {
        openAIApiKey: settings.openAIApiKey,
      }),
    )
  }, [settings.embeddingModel, settings.openAIApiKey])

  const processQuery = async (query: string) => {
    if (!ragEngine) {
      throw new Error('RAGEngine is not initialized')
    }
    return await ragEngine.processQuery(query)
  }

  const updateVaultIndex = async (overwrite = false) => {
    if (!ragEngine) {
      throw new Error('RAGEngine is not initialized')
    }
    return await ragEngine.updateVaultIndex(overwrite)
  }

  return (
    <RAGContext.Provider value={{ processQuery, updateVaultIndex }}>
      {children}
    </RAGContext.Provider>
  )
}

export function useRAG() {
  const context = useContext(RAGContext)
  if (!context) {
    throw new Error('useRAG must be used within a RAGProvider')
  }
  return context
}
