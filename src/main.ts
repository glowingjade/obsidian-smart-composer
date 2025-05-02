import { Editor, MarkdownView, Notice, Plugin, TFile } from 'obsidian'

import { ApplyView } from './ApplyView'
import { ChatView } from './ChatView'
import { ChatProps } from './components/chat-view/Chat'
import { InstallerUpdateRequiredModal } from './components/modals/InstallerUpdateRequiredModal'
import { APPLY_VIEW_TYPE, CHAT_VIEW_TYPE } from './constants'
import { ConversationPromptModal } from './settings/ConversationPromptModal'
import { CreateChatModal } from './settings/CreateChatModal'
import { ChatService, CreateChatOptions } from './core/chat/ChatService'
import { McpManager } from './core/mcp/mcpManager'
import { RAGEngine } from './core/rag/ragEngine'
import { DatabaseManager } from './database/DatabaseManager'
import { PGLiteAbortedException } from './database/exception'
import { migrateToJsonDatabase } from './database/json/migrateToJsonDatabase'
import {
  SmartComposerSettings,
  smartComposerSettingsSchema,
} from './settings/schema/setting.types'
import { parseSmartComposerSettings } from './settings/schema/settings'
import { SmartComposerSettingTab } from './settings/SettingTab'
import { getMentionableBlockData } from './utils/obsidian'

export default class SmartComposerPlugin extends Plugin {
  settings: SmartComposerSettings
  initialChatProps?: ChatProps // TODO: change this to use view state like ApplyView
  settingsChangeListeners: ((newSettings: SmartComposerSettings) => void)[] = []
  mcpManager: McpManager | null = null
  dbManager: DatabaseManager | null = null
  ragEngine: RAGEngine | null = null
  private dbManagerInitPromise: Promise<DatabaseManager> | null = null
  private ragEngineInitPromise: Promise<RAGEngine> | null = null
  private timeoutIds: ReturnType<typeof setTimeout>[] = [] // Use ReturnType instead of number
  
  // Property to store a reference to the ChatView
  chatView: ChatView | null = null
  private chatService: ChatService | null = null

  async onload() {
    await this.loadSettings()

    this.registerView(CHAT_VIEW_TYPE, (leaf) => new ChatView(leaf, this))
    this.registerView(APPLY_VIEW_TYPE, (leaf) => new ApplyView(leaf))

    // This creates an icon in the left ribbon.
    this.addRibbonIcon('wand-sparkles', 'Open smart composer', () =>
      this.openChatView(),
    )

    // This adds a simple command that can be triggered anywhere
    this.addCommand({
      id: 'open-new-chat',
      name: 'Open chat',
      callback: () => this.openChatView(true),
    })

    this.addCommand({
      id: 'add-selection-to-chat',
      name: 'Add selection to chat',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        this.addSelectionToChat(editor, view)
      },
    })

    this.addCommand({
      id: 'rebuild-vault-index',
      name: 'Rebuild entire vault index',
      callback: async () => {
        const notice = new Notice('Rebuilding vault index...', 0)
        try {
          const ragEngine = await this.getRAGEngine()
          await ragEngine.updateVaultIndex(
            { reindexAll: true },
            (queryProgress) => {
              if (queryProgress.type === 'indexing') {
                const { completedChunks, totalChunks } =
                  queryProgress.indexProgress
                notice.setMessage(
                  `Indexing chunks: ${completedChunks} / ${totalChunks}${
                    queryProgress.indexProgress.waitingForRateLimit
                      ? '\n(waiting for rate limit to reset)'
                      : ''
                  }`,
                )
              }
            },
          )
          notice.setMessage('Rebuilding vault index complete')
        } catch (error) {
          console.error(error)
          notice.setMessage('Rebuilding vault index failed')
        } finally {
          this.registerTimeout(() => {
            notice.hide()
          }, 1000)
        }
      },
    })

    this.addCommand({
      id: 'update-vault-index',
      name: 'Update index for modified files',
      callback: async () => {
        const notice = new Notice('Updating vault index...', 0)
        try {
          const ragEngine = await this.getRAGEngine()
          await ragEngine.updateVaultIndex(
            { reindexAll: false },
            (queryProgress) => {
              if (queryProgress.type === 'indexing') {
                const { completedChunks, totalChunks } =
                  queryProgress.indexProgress
                notice.setMessage(
                  `Indexing chunks: ${completedChunks} / ${totalChunks}${
                    queryProgress.indexProgress.waitingForRateLimit
                      ? '\n(waiting for rate limit to reset)'
                      : ''
                  }`,
                )
              }
            },
          )
          notice.setMessage('Vault index updated')
        } catch (error) {
          console.error(error)
          notice.setMessage('Vault index update failed')
        } finally {
          this.registerTimeout(() => {
            notice.hide()
          }, 1000)
        }
      },
    })

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new SmartComposerSettingTab(this.app, this))

    void this.migrateToJsonStorage()
  }

  onunload() {
    // clear all timers
    this.timeoutIds.forEach((id) => clearTimeout(id))
    this.timeoutIds = []

    // RagEngine cleanup
    this.ragEngine?.cleanup()
    this.ragEngine = null

    // Promise cleanup
    this.dbManagerInitPromise = null
    this.ragEngineInitPromise = null

    // DatabaseManager cleanup
    this.dbManager?.cleanup()
    this.dbManager = null

    // McpManager cleanup
    this.mcpManager?.cleanup()
    this.mcpManager = null
    
    // ChatService cleanup
    this.chatService = null
    
    // Clear chat view reference
    this.chatView = null
  }

  async loadSettings() {
    this.settings = parseSmartComposerSettings(await this.loadData())
    await this.saveData(this.settings) // Save updated settings
  }

  async setSettings(newSettings: SmartComposerSettings) {
    const validationResult = smartComposerSettingsSchema.safeParse(newSettings)

    if (!validationResult.success) {
      new Notice(`Invalid settings:
${validationResult.error.issues.map((v) => v.message).join('\n')}`)
      return
    }

    this.settings = newSettings
    await this.saveData(newSettings)
    this.ragEngine?.setSettings(newSettings)
    this.settingsChangeListeners.forEach((listener) => listener(newSettings))
  }

  addSettingsChangeListener(
    listener: (newSettings: SmartComposerSettings) => void,
  ) {
    this.settingsChangeListeners.push(listener)
    return () => {
      this.settingsChangeListeners = this.settingsChangeListeners.filter(
        (l) => l !== listener,
      )
    }
  }

  async openChatView(openNewChat = false) {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView)
    const editor = view?.editor
    if (!view || !editor) {
      this.activateChatView(undefined, openNewChat)
      return
    }
    const selectedBlockData = await getMentionableBlockData(editor, view)
    this.activateChatView(
      {
        selectedBlock: selectedBlockData ?? undefined,
      },
      openNewChat,
    )
  }

  async activateChatView(chatProps?: ChatProps, openNewChat = false) {
    // chatProps is consumed in ChatView.tsx
    this.initialChatProps = chatProps

    const leaf = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE)[0]

    await (leaf ?? this.app.workspace.getRightLeaf(false))?.setViewState({
      type: CHAT_VIEW_TYPE,
      active: true,
    })

    if (openNewChat && leaf && leaf.view instanceof ChatView) {
      leaf.view.openNewChat(chatProps?.selectedBlock)
    }

    this.app.workspace.revealLeaf(
      this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE)[0],
    )
  }

  async addSelectionToChat(editor: Editor, view: MarkdownView) {
    const data = await getMentionableBlockData(editor, view)
    if (!data) return

    const leaves = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE)
    if (leaves.length === 0 || !(leaves[0].view instanceof ChatView)) {
      await this.activateChatView({
        selectedBlock: data,
      })
      return
    }

    // bring leaf to foreground (uncollapse sidebar if it's collapsed)
    await this.app.workspace.revealLeaf(leaves[0])

    const chatView = leaves[0].view
    chatView.addSelectionToChat(data)
    chatView.focusMessage()
  }

  async getDbManager(): Promise<DatabaseManager> {
    if (this.dbManager) {
      return this.dbManager
    }

    if (!this.dbManagerInitPromise) {
      this.dbManagerInitPromise = (async () => {
        try {
          this.dbManager = await DatabaseManager.create(this.app)
          return this.dbManager
        } catch (error) {
          this.dbManagerInitPromise = null
          if (error instanceof PGLiteAbortedException) {
            new InstallerUpdateRequiredModal(this.app).open()
          }
          throw error
        }
      })()
    }

    // if initialization is running, wait for it to complete instead of creating a new initialization promise
    return this.dbManagerInitPromise
  }

  async getRAGEngine(): Promise<RAGEngine> {
    if (this.ragEngine) {
      return this.ragEngine
    }

    if (!this.ragEngineInitPromise) {
      this.ragEngineInitPromise = (async () => {
        try {
          const dbManager = await this.getDbManager()
          this.ragEngine = new RAGEngine(
            this.app,
            this.settings,
            dbManager.getVectorManager(),
          )
          return this.ragEngine
        } catch (error) {
          this.ragEngineInitPromise = null
          throw error
        }
      })()
    }

    return this.ragEngineInitPromise
  }

  async getMcpManager(): Promise<McpManager> {
    if (this.mcpManager) {
      return this.mcpManager
    }

    try {
      this.mcpManager = new McpManager({
        settings: this.settings,
        registerSettingsListener: (
          listener: (settings: SmartComposerSettings) => void,
        ) => this.addSettingsChangeListener(listener),
      })
      await this.mcpManager.initialize()
      return this.mcpManager
    } catch (error) {
      this.mcpManager = null
      throw error
    }
  }

  private registerTimeout(callback: () => void, timeout: number): void {
    const timeoutId = setTimeout(callback, timeout)
    this.timeoutIds.push(timeoutId)
  }

  private async migrateToJsonStorage() {
    try {
      const dbManager = await this.getDbManager()
      await migrateToJsonDatabase(this.app, dbManager, async () => {
        await this.reloadChatView()
        console.log('Migration to JSON storage completed successfully')
      })
    } catch (error) {
      console.error('Failed to migrate to JSON storage:', error)
      new Notice(
        'Failed to migrate to JSON storage. Please check the console for details.',
      )
    }
  }

  private async reloadChatView() {
    const leaves = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE)
    if (leaves.length === 0 || !(leaves[0].view instanceof ChatView)) {
      return
    }
    new Notice('Reloading "smart-composer" due to migration', 1000)
    leaves[0].detach()
    await this.activateChatView()
  }

  /**
   * Opens a specific conversation by ID
   * @param conversationId ID of the conversation to open
   * @returns Promise that resolves when the conversation is opened
   */
  async openConversation(conversationId: string): Promise<void> {
    // Make sure chat view is open
    await this.activateChatView()
    
    // Get the chat view
    const leaf = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE)[0]
    if (!leaf || !(leaf.view instanceof ChatView)) {
      throw new Error("Failed to open chat view")
    }
    
    // Open the conversation
    await leaf.view.loadConversation(conversationId)
    
    // Reveal the leaf
    this.app.workspace.revealLeaf(leaf)
  }
  
  /**
   * Prompts the user to enter a conversation ID
   * @returns Promise that resolves to the entered ID or null if cancelled
   */
  async promptForConversationId(): Promise<string | null> {
    return new Promise((resolve) => {
      const modal = new ConversationPromptModal(this.app, (result) => {
        resolve(result)
      })
      modal.open()
    })
  }
  
  /**
   * Prompts the user to enter information for a new chat
   * @returns Promise that resolves to the message and file or null if cancelled
   */
  async promptForCreateChat(): Promise<{ message: string; file?: TFile | null } | null> {
    return new Promise((resolve) => {
      const modal = new CreateChatModal(this.app, (result) => {
        resolve(result)
      })
      modal.open()
    })
  }
  
  /**
   * Create a new chat with the given text block and automatically submit the message
   * @param blockData The text block to add to the chat
   * @returns Promise that resolves to the ID of the created conversation
   */
  async createChatWithBlock(blockData: { file: TFile; text: string; startLine: number; endLine: number }): Promise<string> {
    // Make sure chat view is open
    await this.activateChatView()
    
    // Get the chat view
    const leaf = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE)[0]
    if (!leaf || !(leaf.view instanceof ChatView)) {
      throw new Error("Failed to open chat view")
    }
    
    // Create and submit the chat - access via the method we added to ChatView
    const conversationId = await (leaf.view as ChatView).createAndSubmitChatFromBlock(blockData)
    if (!conversationId) {
      throw new Error("Failed to create chat")
    }
    
    // Reveal the leaf
    this.app.workspace.revealLeaf(leaf)
    
    return conversationId
  }

  /**
   * Lazily initialize ChatService which handles headless chat creation/streaming.
   */
  private async getChatService(): Promise<ChatService> {
    if (this.chatService) return this.chatService

    // Ensure db manager exists (for migrations etc.)
    await this.getDbManager()

    const chatManagerModule = await import('./database/json/chat/ChatManager')
    const chatManager = new chatManagerModule.ChatManager(this.app)

    this.chatService = new ChatService({
      app: this.app,
      settings: this.settings,
      chatManager,
      getRAGEngine: () => this.getRAGEngine(),
      getMcpManager: () => this.getMcpManager(),
    })
    return this.chatService
  }

  /**
   * Public API for other plugins – create chat quietly and return id.
   */
  async createChat(initialText: string, opts?: CreateChatOptions): Promise<string> {
    const service = await this.getChatService()
    return service.createChat(initialText, opts)
  }

  /** Convenience: create a chat, wait until assistant finished, then open UI. */
  async createChatAndOpen(initialText: string, opts?: CreateChatOptions) {
    const service = await this.getChatService()
    const id = await service.createChat(initialText, opts)
    await service.waitUntilFinished(id)
    await this.openConversation(id)
    return id
  }

  /** Allow other plugins to await the assistant stream without opening UI. */
  async waitUntilFinished(conversationId: string): Promise<void> {
    const service = await this.getChatService()
    return service.waitUntilFinished(conversationId)
  }
}
