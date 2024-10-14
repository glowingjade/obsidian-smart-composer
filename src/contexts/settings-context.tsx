import React, { useMemo } from 'react'

import { SmartCopilotSettings } from '../types/settings'

type SettingsContextType = {
  settings: SmartCopilotSettings
  setSettings: (newSettings: SmartCopilotSettings) => void
}

// Settings context
const SettingsContext = React.createContext<SettingsContextType | undefined>(
  undefined,
)

export const SettingsProvider = ({
  children,
  settings,
  setSettings,
}: {
  children: React.ReactNode
  settings: SmartCopilotSettings
  setSettings: (newSettings: SmartCopilotSettings) => void
}) => {
  const value = useMemo(
    () => ({ settings, setSettings }),
    [settings, setSettings],
  )

  return (
    <SettingsContext.Provider value={value}>
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
