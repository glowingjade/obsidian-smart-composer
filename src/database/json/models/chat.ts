import { App } from 'obsidian'

import { CHAT } from '../constants'
import { ChatDocument, ChatIndex } from '../schemas/chat'

import { IndexedFileStorage } from './indexedFileStorage'

export class ChatManager extends IndexedFileStorage<ChatDocument, ChatIndex> {
  constructor(app: App) {
    super(app, {
      rootPath: CHAT.ROOT_DIR,
      indexFileName: CHAT.INDEX_FILE,
      documentsDirName: CHAT.DOCUMENTS_DIR,
      currentSchemaVersion: CHAT.SCHEMA_VERSION,
    })
  }

  async createChatDocument(id: string): Promise<ChatDocument> {
    return this.createDocument(id, {
      title: 'New chat',
      messages: [],
    })
  }

  protected createIndexEntry(chatDocument: ChatDocument): ChatIndex {
    return {
      schemaVersion: chatDocument.schemaVersion,
      id: chatDocument.id,
      title: chatDocument.title,
      createdAt: chatDocument.createdAt,
      updatedAt: chatDocument.updatedAt,
    }
  }
}
