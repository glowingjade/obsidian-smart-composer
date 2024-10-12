import { Editor, MarkdownView, Plugin } from 'obsidian'

import { ApplyView } from './ApplyView'
import { ChatView } from './ChatView'
import { ChatProps } from './components/Chat'
import { APPLY_VIEW_TYPE, CHAT_VIEW_TYPE, DEFAULT_SETTINGS } from './constants'
import { SmartCopilotSettingTab } from './settings/SettingTab'
import { SmartCopilotSettings } from './types/settings'
import { getMentionableBlockData } from './utils/obsidian'

// Remember to rename these classes and interfaces!
export default class SmartCopilotPlugin extends Plugin {
  settings: SmartCopilotSettings
  initialChatProps?: ChatProps // TODO: change this to use view state like ApplyView

  async onload() {
    await this.loadSettings()

    this.registerView(CHAT_VIEW_TYPE, (leaf) => new ChatView(leaf, this))
    this.registerView(APPLY_VIEW_TYPE, (leaf) => new ApplyView(leaf))

    // This creates an icon in the left ribbon.
    this.addRibbonIcon('message-square', 'Open Smart Composer', () =>
      this.openChatView(),
    )

    // This adds a simple command that can be triggered anywhere
    this.addCommand({
      id: 'open-chat-view',
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

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new SmartCopilotSettingTab(this.app, this))
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings() {
    await this.saveData(this.settings)
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

  async activateChatView(chatProps?: ChatProps) {
    // chatProps is consumed in ChatView.tsx
    this.initialChatProps = chatProps

    this.app.workspace.detachLeavesOfType(CHAT_VIEW_TYPE)

    await this.app.workspace.getRightLeaf(false)?.setViewState({
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
}
