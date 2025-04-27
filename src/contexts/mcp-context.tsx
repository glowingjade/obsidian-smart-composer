import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
} from 'react'

import { McpManager } from '../core/mcp/mcpManager'

export type McpContextType = {
  getMcpManager: () => Promise<McpManager>
}

const McpContext = createContext<McpContextType | null>(null)

export function McpProvider({
  getMcpManager,
  children,
}: PropsWithChildren<{ getMcpManager: () => Promise<McpManager> }>) {
  useEffect(() => {
    void getMcpManager()
  }, [getMcpManager])

  const value = useMemo(() => {
    return { getMcpManager }
  }, [getMcpManager])

  return <McpContext.Provider value={value}>{children}</McpContext.Provider>
}

export function useMcp() {
  const context = useContext(McpContext)
  if (!context) {
    throw new Error('useMcp must be used within a McpProvider')
  }
  return context
}
