import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

import { RAGEngine } from '../utils/ragEngine'

import { useApp } from './app-context'
import { useSettings } from './settings-context'

export type RAGContextType = {
  ragEngine: RAGEngine | null
}

const RAGContext = createContext<RAGContextType | null>(null)

export function RAGProvider({
  children,
  onRAGEngineChange,
}: PropsWithChildren<{ onRAGEngineChange: (ragEngine: RAGEngine) => void }>) {
  const app = useApp()
  const { settings } = useSettings()
  const [ragEngine, setRagEngine] = useState<RAGEngine | null>(null)

  useEffect(() => {
    RAGEngine.create(app, settings).then(setRagEngine)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app])

  useEffect(() => {
    if (ragEngine) {
      onRAGEngineChange(ragEngine)
    }
  }, [ragEngine, onRAGEngineChange])

  useEffect(() => {
    ragEngine?.setSettings(settings)
  }, [ragEngine, settings])

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
