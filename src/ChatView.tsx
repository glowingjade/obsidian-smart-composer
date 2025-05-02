import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ItemView, TFile, WorkspaceLeaf } from 'obsidian'
import React from 'react'
import { Root, createRoot } from 'react-dom/client'

import Chat, { ChatProps, ChatRef } from './components/chat-view/Chat'
import { CHAT_VIEW_TYPE } from './constants'
import { AppProvider } from './contexts/app-context'
import { ChatViewProvider } from './contexts/chat-view-context'
import { DarkModeProvider } from './contexts/dark-mode-context'
import { DatabaseProvider } from './contexts/database-context'
import { DialogContainerProvider } from './contexts/dialog-container-context'
import { McpProvider } from './contexts/mcp-context'
import { PluginProvider } from './contexts/plugin-context'
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
    // Store reference to this view in the plugin
    plugin.chatView = this
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
    if (this.plugin.chatView === this) {
      this.plugin.chatView = null
    }
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
      <ChatViewProvider chatView={this}>
        <PluginProvider plugin={this.plugin}>
          <AppProvider app={this.app}>
            <SettingsProvider
              settings={this.plugin.settings}
              setSettings={(newSettings) =>
                this.plugin.setSettings(newSettings)
              }
              addSettingsChangeListener={(listener) =>
                this.plugin.addSettingsChangeListener(listener)
              }
            >
              <DarkModeProvider>
                <DatabaseProvider
                  getDatabaseManager={() => this.plugin.getDbManager()}
                >
                  <RAGProvider getRAGEngine={() => this.plugin.getRAGEngine()}>
                    <McpProvider
                      getMcpManager={() => this.plugin.getMcpManager()}
                    >
                      <QueryClientProvider client={queryClient}>
                        <React.StrictMode>
                          <DialogContainerProvider
                            container={
                              this.containerEl.children[1] as HTMLElement
                            }
                          >
                            <Chat
                              ref={this.chatRef}
                              {...this.initialChatProps}
                            />
                          </DialogContainerProvider>
                        </React.StrictMode>
                      </QueryClientProvider>
                    </McpProvider>
                  </RAGProvider>
                </DatabaseProvider>
              </DarkModeProvider>
            </SettingsProvider>
          </AppProvider>
        </PluginProvider>
      </ChatViewProvider>,
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

  /**
   * Loads a specific conversation by ID
   */
  loadConversation(conversationId: string) {
    return this.chatRef.current?.loadConversation(conversationId)
  }

  /**
   * Creates a new chat with block data and automatically submits it
   * @param blockData The text block to add to the chat
   * @returns Promise that resolves to the conversation ID
   */
  async createAndSubmitChatFromBlock(blockData: {
    file: TFile
    text: string
    startLine: number
    endLine: number
  }): Promise<string | undefined> {
    // Convert to MentionableBlockData format
    const mentionableBlock: MentionableBlockData = {
      file: blockData.file,
      content: blockData.text,
      startLine: blockData.startLine,
      endLine: blockData.endLine,
    }
    return this.chatRef.current?.createAndSubmitChat(mentionableBlock)
  }
}
