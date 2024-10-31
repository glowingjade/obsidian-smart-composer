import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ItemView, WorkspaceLeaf } from 'obsidian'
import React from 'react'
import { Root, createRoot } from 'react-dom/client'

import Chat, { ChatProps, ChatRef } from './components/chat-view/Chat'
import { CHAT_VIEW_TYPE } from './constants'
import { AppProvider } from './contexts/app-context'
import { DarkModeProvider } from './contexts/dark-mode-context'
import { DialogContainerProvider } from './contexts/dialog-container-context'
import { LLMProvider } from './contexts/llm-context'
import { RAGProvider } from './contexts/rag-context'
import { SettingsProvider } from './contexts/settings-context'
import SmartCopilotPlugin from './main'
import { MentionableBlockData } from './types/mentionable'
import { SmartCopilotSettings } from './types/settings'

export class ChatView extends ItemView {
  private root: Root | null = null
  private settings: SmartCopilotSettings
  private initialChatProps?: ChatProps
  private chatRef: React.RefObject<ChatRef> = React.createRef()

  constructor(
    leaf: WorkspaceLeaf,
    private plugin: SmartCopilotPlugin,
  ) {
    super(leaf)
    this.settings = plugin.settings
    this.initialChatProps = plugin.initialChatProps
  }

  getViewType() {
    return CHAT_VIEW_TYPE
  }

  getIcon() {
    return 'message-square'
  }

  getDisplayText() {
    return 'Smart Composer Chat'
  }

  async onOpen() {
    await this.render()

    // Consume chatProps
    this.initialChatProps = undefined
  }

  async onClose() {
    this.root?.unmount()
  }

  async render() {
    if (!this.root) {
      this.root = createRoot(this.containerEl.children[1])
    }

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          gcTime: 0, // Immediately garbage collect queries. It prevents memory leak on ChatView close.
        },
        mutations: {
          gcTime: 0, // Immediately garbage collect mutations. It prevents memory leak on ChatView close.
        },
      },
    })
    const ragEngine = await this.plugin.getRAGEngine()

    this.root.render(
      <AppProvider app={this.app}>
        <SettingsProvider
          settings={this.settings}
          setSettings={(newSettings) => this.plugin.setSettings(newSettings)}
          addSettingsChangeListener={(listener) =>
            this.plugin.addSettingsChangeListener(listener)
          }
        >
          <DarkModeProvider>
            <LLMProvider>
              <RAGProvider ragEngine={ragEngine}>
                <QueryClientProvider client={queryClient}>
                  <React.StrictMode>
                    <DialogContainerProvider
                      container={this.containerEl.children[1] as HTMLElement}
                    >
                      <Chat ref={this.chatRef} {...this.initialChatProps} />
                    </DialogContainerProvider>
                  </React.StrictMode>
                </QueryClientProvider>
              </RAGProvider>
            </LLMProvider>
          </DarkModeProvider>
        </SettingsProvider>
      </AppProvider>,
    )
  }

  addSelectionToChat(data: MentionableBlockData) {
    this.chatRef.current?.addSelectionToChat(data)
  }

  focusMessage() {
    this.chatRef.current?.focusMessage()
  }
}
