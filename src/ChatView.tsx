import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ItemView, WorkspaceLeaf } from 'obsidian'
import React from 'react'
import { Root, createRoot } from 'react-dom/client'

import Chat, { ChatProps, ChatRef } from './components/chat-view/Chat'
import { CHAT_VIEW_TYPE } from './constants'
import { AppProvider } from './contexts/app-context'
import { DarkModeProvider } from './contexts/dark-mode-context'
import { DatabaseProvider } from './contexts/database-context'
import { DialogContainerProvider } from './contexts/dialog-container-context'
import { RAGProvider } from './contexts/rag-context'
import { SettingsProvider } from './contexts/settings-context'
import SmartComposerPlugin from './main'
import { MentionableBlockData } from './types/mentionable'

export class ChatView extends ItemView {
  private root: Root | null = null
  private initialChatProps?: ChatProps
  private chatRef: React.RefObject<ChatRef> = React.createRef()

  constructor(
    leaf: WorkspaceLeaf,
    private plugin: SmartComposerPlugin,
  ) {
    super(leaf)
    this.initialChatProps = plugin.initialChatProps
  }

  getViewType() {
    return CHAT_VIEW_TYPE
  }

  getIcon() {
    return 'wand-sparkles'
  }

  getDisplayText() {
    return 'Smart composer chat'
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

    this.root.render(
      <AppProvider app={this.app}>
        <SettingsProvider
          settings={this.plugin.settings}
          setSettings={(newSettings) => this.plugin.setSettings(newSettings)}
          addSettingsChangeListener={(listener) =>
            this.plugin.addSettingsChangeListener(listener)
          }
        >
          <DarkModeProvider>
            <DatabaseProvider
              getDatabaseManager={() => this.plugin.getDbManager()}
            >
              <RAGProvider getRAGEngine={() => this.plugin.getRAGEngine()}>
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
            </DatabaseProvider>
          </DarkModeProvider>
        </SettingsProvider>
      </AppProvider>,
    )
  }

  openNewChat(selectedBlock?: MentionableBlockData) {
    this.chatRef.current?.openNewChat(selectedBlock)
  }

  addSelectionToChat(selectedBlock: MentionableBlockData) {
    this.chatRef.current?.addSelectionToChat(selectedBlock)
  }

  focusMessage() {
    this.chatRef.current?.focusMessage()
  }
}
