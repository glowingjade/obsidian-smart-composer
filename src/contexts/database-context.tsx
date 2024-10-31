import { createContext, useContext, useMemo } from 'react'

import { DatabaseManager } from '../database/DatabaseManager'
import { TemplateManager } from '../database/modules/template/TemplateManager'
import { VectorManager } from '../database/modules/vector/VectorManager'

type DatabaseContextType = {
  databaseManager: DatabaseManager
  vectorManager: VectorManager
  templateManager: TemplateManager
}

const DatabaseContext = createContext<DatabaseContextType | null>(null)

export function DatabaseProvider({
  children,
  databaseManager,
}: {
  children: React.ReactNode
  databaseManager: DatabaseManager
}) {
  const vectorManager = useMemo(() => {
    return databaseManager.getVectorManager()
  }, [databaseManager])

  const templateManager = useMemo(() => {
    return databaseManager.getTemplateManager()
  }, [databaseManager])

  return (
    <DatabaseContext.Provider
      value={{ databaseManager, vectorManager, templateManager }}
    >
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
