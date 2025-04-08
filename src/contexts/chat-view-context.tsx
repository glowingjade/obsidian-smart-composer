import React from 'react'

import { ChatView } from '../ChatView'

const ChatViewContext = React.createContext<ChatView | undefined>(undefined)

export const ChatViewProvider = ({
  children,
  chatView,
}: {
  children: React.ReactNode
  chatView: ChatView
}) => {
  return (
    <ChatViewContext.Provider value={chatView}>
      {children}
    </ChatViewContext.Provider>
  )
}

export const useChatView = () => {
  const chatView = React.useContext(ChatViewContext)
  if (!chatView) {
    throw new Error('useChatView must be used within a ChatViewProvider')
  }
  return chatView
}
