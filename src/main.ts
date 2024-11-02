import { Editor, MarkdownView, Notice, Plugin } from 'obsidian'

import { ApplyView } from './ApplyView'
import { ChatView } from './ChatView'
import { ChatProps } from './components/chat-view/Chat'
import { APPLY_VIEW_TYPE, CHAT_VIEW_TYPE } from './constants'
import { RAGEngine } from './core/rag/ragEngine'
import { DatabaseManager } from './database/DatabaseManager'
import { SmartCopilotSettingTab } from './settings/SettingTab'
import {
  SmartCopilotSettings,
  parseSmartCopilotSettings,
} from './types/settings'
import { getMentionableBlockData } from './utils/obsidian'

// Remember to rename these classes and interfaces!
export default class SmartCopilotPlugin extends Plugin {
  settings: SmartCopilotSettings
  initialChatProps?: ChatProps // TODO: change this to use view state like ApplyView
  settingsChangeListeners: ((newSettings: SmartCopilotSettings) => void)[] = []
  dbManager: DatabaseManager | null = null
  ragEngine: RAGEngine | null = null

  async onload() {
    await this.loadSettings()

    this.registerView(CHAT_VIEW_TYPE, (leaf) => new ChatView(leaf, this))
    this.registerView(APPLY_VIEW_TYPE, (leaf) => new ApplyView(leaf))

    // This creates an icon in the left ribbon.
    this.addRibbonIcon('message-square', 'Open smart composer', () =>
      this.openChatView(),
    )

    // This adds a simple command that can be triggered anywhere
    this.addCommand({
      id: 'open-new-chat',
      name: 'Open chat',
      callback: () => this.openChatView(),
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
                  `Indexing chunks: ${completedChunks} / ${totalChunks}`,
                )
              }
            },
          )
          notice.setMessage('Rebuilding vault index complete')
        } catch (error) {
          console.error(error)
          notice.setMessage('Rebuilding vault index failed')
        } finally {
          setTimeout(() => {
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
                  `Indexing chunks: ${completedChunks} / ${totalChunks}`,
                )
              }
            },
          )
          notice.setMessage('Vault index updated')
        } catch (error) {
          console.error(error)
          notice.setMessage('Vault index update failed')
        } finally {
          setTimeout(() => {
            notice.hide()
          }, 1000)
        }
      },
    })

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new SmartCopilotSettingTab(this.app, this))
  }

  onunload() {
    this.dbManager?.cleanup()
    this.dbManager = null
  }

  async loadSettings() {
    this.settings = parseSmartCopilotSettings(await this.loadData())
    await this.saveData(this.settings) // Save updated settings
  }

  async setSettings(newSettings: SmartCopilotSettings) {
    this.settings = newSettings
    await this.saveData(newSettings)
    this.ragEngine?.setSettings(newSettings)
    this.settingsChangeListeners.forEach((listener) => listener(newSettings))
  }

  addSettingsChangeListener(
    listener: (newSettings: SmartCopilotSettings) => void,
  ) {
    this.settingsChangeListeners.push(listener)
    return () => {
      this.settingsChangeListeners = this.settingsChangeListeners.filter(
        (l) => l !== listener,
      )
    }
  }

  async openChatView() {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView)
    const editor = view?.editor
    if (!view || !editor) {
      this.activateChatView()
      return
    }
    const selectedBlockData = await getMentionableBlockData(editor, view)
    if (!selectedBlockData) {
      this.activateChatView()
      return
    }
    this.activateChatView({
      selectedBlock: selectedBlockData,
    })
  }

  /**
   * TODO: this is buggy, should fix first before using it
   */
  async openNewChat() {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView)
    const editor = view?.editor
    if (!view || !editor) {
      this.activateChatView()
      return
    }

    const selectedBlock = await getMentionableBlockData(editor, view)
    const leaves = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE)
    if (leaves.length === 0) {
      await this.activateChatView({
        selectedBlock: selectedBlock ?? undefined,
      })
    } else {
      const chatView = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE)[0]
        .view as ChatView
      // sometimes, "openNewChat" not exists in chatView. don't know why
      chatView.openNewChat(selectedBlock ?? undefined)
    }
  }

  async activateChatView(chatProps?: ChatProps) {
    // chatProps is consumed in ChatView.tsx
    this.initialChatProps = chatProps

    const leaf = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE)[0]

    await (leaf ?? this.app.workspace.getRightLeaf(false))?.setViewState({
      type: CHAT_VIEW_TYPE,
      active: true,
    })

    this.app.workspace.revealLeaf(
      this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE)[0],
    )
  }

  async addSelectionToChat(editor: Editor, view: MarkdownView) {
    const data = await getMentionableBlockData(editor, view)
    if (!data) return

    const leaves = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE)
    if (leaves.length === 0) {
      await this.activateChatView({
        selectedBlock: data,
      })
    }

    const chatView = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE)[0]
      .view as ChatView
    chatView.addSelectionToChat(data)
    chatView.focusMessage()
  }

  async getDbManager(): Promise<DatabaseManager> {
    if (!this.dbManager) {
      this.dbManager = await DatabaseManager.create(this.app)
    }
    return this.dbManager
  }

  async getRAGEngine(): Promise<RAGEngine> {
    const dbManager = await this.getDbManager()
    if (!this.ragEngine) {
      this.ragEngine = new RAGEngine(this.app, this.settings, dbManager)
    }
    return this.ragEngine
  }
}
