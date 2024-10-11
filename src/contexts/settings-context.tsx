import React from 'react'

import { SmartCopilotSettings } from '../types/settings'

// Settings context
const SettingsContext = React.createContext<SmartCopilotSettings | undefined>(
  undefined,
)

export const SettingsProvider = ({
  children,
  settings,
}: {
  children: React.ReactNode
  settings: SmartCopilotSettings
}) => {
  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => {
  const settings = React.useContext(SettingsContext)
  if (!settings) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return settings
}
