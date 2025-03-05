import { App } from 'obsidian'

import { ChatConversationManager } from '../../utils/chatHistoryManager'
import { DatabaseManager } from '../DatabaseManager'
import { DuplicateTemplateException } from '../exception'

import { ChatManager } from './chat/ChatManager'
import { TemplateManager } from './template/TemplateManager'

async function transferChatHistoryFromLegacy(app: App): Promise<void> {
  const oldChatManager = new ChatConversationManager(app)
  const newChatManager = new ChatManager(app)

  const chatList = await oldChatManager.getChatList()

  for (const chatMeta of chatList) {
    try {
      const oldChat = await oldChatManager.findChatConversation(chatMeta.id)
      if (!oldChat) {
        continue
      }

      const existingChat = await newChatManager.findById(oldChat.id)
      if (existingChat) {
        continue
      }

      await newChatManager.createChat({
        id: oldChat.id,
        title: oldChat.title,
        messages: oldChat.messages,
        createdAt: oldChat.createdAt,
        updatedAt: oldChat.updatedAt,
      })

      await oldChatManager.deleteChatConversation(oldChat.id)
    } catch (error) {
      console.error(`Error migrating chat ${chatMeta.id}:`, error)
    }
  }

  console.log('Chat history migration to JSON database completed')
}

async function transferTemplatesFromDrizzle(
  app: App,
  dbManager: DatabaseManager,
): Promise<void> {
  const jsonTemplateManager = new TemplateManager(app)
  const drizzleTemplateManager = dbManager.getTemplateManager()

  const templates = await drizzleTemplateManager.findAllTemplates()

  for (const template of templates) {
    try {
      await jsonTemplateManager.createTemplate({
        name: template.name,
        content: template.content,
      })
      await drizzleTemplateManager.deleteTemplate(template.id)
    } catch (error) {
      if (error instanceof DuplicateTemplateException) {
        console.log(`Duplicate template found: ${template.name}. Skipping...`)
      } else {
        console.error(`Error migrating template ${template.name}:`, error)
      }
    }
  }

  console.log('Templates migration to JSON database completed')
}

export async function migrateToJsonDatabase(
  app: App,
  dbManager: DatabaseManager,
): Promise<void> {
  await transferChatHistoryFromLegacy(app)
  await transferTemplatesFromDrizzle(app, dbManager)
}
