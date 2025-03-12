import { useMemo } from 'react'

import { useApp } from '../contexts/app-context'
import { ChatManager } from '../database/json/chat/ChatManager'
import { TemplateManager } from '../database/json/template/TemplateManager'

export function useTemplateManager() {
  const app = useApp()
  return useMemo(() => new TemplateManager(app), [app])
}

export function useChatManager() {
  const app = useApp()
  return useMemo(() => new ChatManager(app), [app])
}
