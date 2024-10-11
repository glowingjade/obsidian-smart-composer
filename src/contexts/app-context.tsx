import { App } from 'obsidian'
import React from 'react'

// App context
const AppContext = React.createContext<App | undefined>(undefined)

export const AppProvider = ({
  children,
  app,
}: {
  children: React.ReactNode
  app: App
}) => {
  return <AppContext.Provider value={app}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const app = React.useContext(AppContext)
  if (!app) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return app
}
