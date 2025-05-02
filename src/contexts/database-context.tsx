import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react'

import { DatabaseManager } from '../database/DatabaseManager'
import { LegacyTemplateManager } from '../database/modules/template/TemplateManager'
import { VectorManager } from '../database/modules/vector/VectorManager'

type DatabaseContextType = {
  getDatabaseManager: () => Promise<DatabaseManager>
  getVectorManager: () => Promise<VectorManager>
  getTemplateManager: () => Promise<LegacyTemplateManager>
}

const DatabaseContext = createContext<DatabaseContextType | null>(null)

export function DatabaseProvider({
  children,
  getDatabaseManager,
}: {
  children: React.ReactNode
  getDatabaseManager: () => Promise<DatabaseManager>
}) {
  const getVectorManager = useCallback(async () => {
    return (await getDatabaseManager()).getVectorManager()
  }, [getDatabaseManager])

  const getTemplateManager = useCallback(async () => {
    return (await getDatabaseManager()).getTemplateManager()
  }, [getDatabaseManager])

  useEffect(() => {
    // start initialization of dbManager in the background
    void getDatabaseManager()
  }, [getDatabaseManager])

  const value = useMemo(() => {
    return { getDatabaseManager, getVectorManager, getTemplateManager }
  }, [getDatabaseManager, getVectorManager, getTemplateManager])

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  )
}

export function useDatabase(): DatabaseContextType {
  const context = useContext(DatabaseContext)
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider')
  }
  return context
}
