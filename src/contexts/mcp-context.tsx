import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
} from 'react'

import { MCPManager } from '../utils/mcp'

export type MCPContextType = {
  getMCPManager: () => Promise<MCPManager>
}

const MCPContext = createContext<MCPContextType | null>(null)

export function MCPProvider({
  getMCPManager,
  children,
}: PropsWithChildren<{ getMCPManager: () => Promise<MCPManager> }>) {
  useEffect(() => {
    void getMCPManager()
  }, [getMCPManager])

  const value = useMemo(() => {
    return { getMCPManager }
  }, [getMCPManager])

  return <MCPContext.Provider value={value}>{children}</MCPContext.Provider>
}

export function useMCP() {
  const context = useContext(MCPContext)
  if (!context) {
    throw new Error('useMCP must be used within a MCPProvider')
  }
  return context
}
