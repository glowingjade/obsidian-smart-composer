import { App, normalizePath } from 'obsidian'

import { ChatConversation, ChatConversationMeta } from '../types/chat'

const CURRENT_SCHEMA_VERSION = 3
const SUPPORTED_SCHEMA_VERSION = 2
const CHAT_HISTORY_DIR = '.smtcmp_chat_histories'
const CHAT_LIST_FILE = 'chat_list.json'

export class ChatConversationManager {
  private app: App

  constructor(app: App) {
    this.app = app
  }

  async createChatConversation(id: string): Promise<ChatConversation> {
    const newChatConversation: ChatConversation = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      id,
      title: 'New chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    }
    await this.saveChatConversation(newChatConversation)
    return newChatConversation
  }

  async deleteChatConversation(id: string): Promise<void> {
    const filePath = this.getChatConversationPath(id)
    await this.app.vault.adapter.remove(filePath)
    const chatList = await this.getChatList()
    const updatedChatList = chatList.filter((chat) => chat.id !== id)
    await this.app.vault.adapter.write(
      this.getChatListPath(),
      JSON.stringify(updatedChatList),
    )
  }

  async findChatConversation(id: string): Promise<ChatConversation | null> {
    const filePath = this.getChatConversationPath(id)
    if (await this.app.vault.adapter.exists(filePath)) {
      const content = await this.app.vault.adapter.read(filePath)
      const chatConversation = JSON.parse(content) as ChatConversation
      return chatConversation
    }
    return null
  }

  async saveChatConversation(
    chatConversation: ChatConversation,
  ): Promise<void> {
    await this.ensureChatConversationDir()
    const filePath = this.getChatConversationPath(chatConversation.id)
    await this.app.vault.adapter.write(
      filePath,
      JSON.stringify(chatConversation),
    )
    await this.updateChatList(chatConversation)
  }

  async getChatList(): Promise<ChatConversationMeta[]> {
    const chatListPath = this.getChatListPath()
    if (await this.app.vault.adapter.exists(chatListPath)) {
      const content = await this.app.vault.adapter.read(chatListPath)
      const chatList = JSON.parse(content) as ChatConversationMeta[]
      return chatList.filter(
        // TODO: should migrate from 2 to 3
        (chat) => chat.schemaVersion >= SUPPORTED_SCHEMA_VERSION,
      )
    }
    return []
  }

  private async ensureChatConversationDir() {
    const dirPath = normalizePath(CHAT_HISTORY_DIR)
    if (!(await this.app.vault.adapter.exists(dirPath))) {
      await this.app.vault.createFolder(dirPath)
    }
  }

  private async updateChatList(
    chatConversation: ChatConversation,
  ): Promise<void> {
    const chatList = await this.getChatList()
    const chatMeta: ChatConversationMeta = {
      schemaVersion: chatConversation.schemaVersion,
      id: chatConversation.id,
      title: chatConversation.title,
      createdAt: chatConversation.createdAt,
      updatedAt: chatConversation.updatedAt,
    }
    const existingIndex = chatList.findIndex(
      (chat) => chat.id === chatConversation.id,
    )
    if (existingIndex !== -1) {
      chatList[existingIndex] = chatMeta
    } else {
      chatList.push(chatMeta)
    }
    chatList.sort((a, b) => b.updatedAt - a.updatedAt)
    await this.app.vault.adapter.write(
      this.getChatListPath(),
      JSON.stringify(chatList),
    )
  }

  private getChatListPath(): string {
    return normalizePath(`${CHAT_HISTORY_DIR}/${CHAT_LIST_FILE}`)
  }

  private getChatConversationPath(id: string): string {
    return normalizePath(`${CHAT_HISTORY_DIR}/${id}.json`)
  }
}
