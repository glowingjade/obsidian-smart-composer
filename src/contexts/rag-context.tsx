import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
} from 'react'

import { getEmbeddingModel } from '../utils/embedding'
import { RAGEngine } from '../utils/ragEngine'

import { useApp } from './app-context'
import { useSettings } from './settings-context'

export type RAGContextType = {
  ragEngine: RAGEngine | null
}

const RAGContext = createContext<RAGContextType | null>(null)

export function RAGProvider({
  setPluginRAGEngine,
  children,
}: PropsWithChildren<{ setPluginRAGEngine: (ragEngine: RAGEngine) => void }>) {
  const app = useApp()
  const { settings } = useSettings()

  const ragEngine = useMemo(() => {
    return new RAGEngine(app, settings)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app])

  const embeddingModel = useMemo(() => {
    return getEmbeddingModel(settings.embeddingModel, {
      openAIApiKey: settings.openAIApiKey,
    })
  }, [settings.embeddingModel, settings.openAIApiKey])

  useEffect(() => {
    void ragEngine.initialize(embeddingModel)
    setPluginRAGEngine(ragEngine)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ragEngine])

  useEffect(() => {
    ragEngine?.setSettings(settings)
  }, [ragEngine, settings])

  useEffect(() => {
    if (!ragEngine || !embeddingModel) {
      return
    }
    ragEngine.setEmbeddingModel(embeddingModel)
  }, [ragEngine, embeddingModel])

  return (
    <RAGContext.Provider value={{ ragEngine }}>{children}</RAGContext.Provider>
  )
}

export function useRAG() {
  const context = useContext(RAGContext)
  if (!context) {
    throw new Error('useRAG must be used within a RAGProvider')
  }
  return context
}
