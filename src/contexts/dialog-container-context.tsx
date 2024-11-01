import React, { createContext, useContext } from 'react'

const DialogContainerContext = createContext<HTMLElement | null>(null)

export function DialogContainerProvider({
  children,
  container,
}: {
  children: React.ReactNode
  container: HTMLElement | null
}) {
  return (
    <DialogContainerContext.Provider value={container}>
      {children}
    </DialogContainerContext.Provider>
  )
}

export function useDialogContainer() {
  const context = useContext(DialogContainerContext)
  if (!context) {
    throw new Error(
      'useDialogContainer must be used within a DialogContainerProvider',
    )
  }
  return context
}
