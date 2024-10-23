import { PropsWithChildren, createContext, useContext } from 'react'

import { RAGEngine } from '../utils/ragEngine'

export type RAGContextType = {
  ragEngine: RAGEngine | null
}

const RAGContext = createContext<RAGContextType | null>(null)

export function RAGProvider({
  ragEngine,
  children,
}: PropsWithChildren<{ ragEngine: RAGEngine | null }>) {
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
