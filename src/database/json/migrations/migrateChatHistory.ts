import { App } from 'obsidian'

import { ChatConversationManager } from '../../../utils/chatHistoryManager'
import { ChatManager } from '../chat/ChatManager'

/**
 * Migrates chat history data from the old ChatConversationManager format
 * to the new JSON database structure.
 *
 * @param app The Obsidian app instance
 * @returns Promise that resolves when migration is complete
 */
export async function migrateChatHistoryToJsonDb(app: App): Promise<void> {
  const oldChatManager = new ChatConversationManager(app)
  const newChatManager = new ChatManager(app)

  const chatList = await oldChatManager.getChatList()

  for (const chatMeta of chatList) {
    try {
      const oldChat = await oldChatManager.findChatConversation(chatMeta.id)

      if (!oldChat) {
        console.log(`Chat with ID ${chatMeta.id} not found. Skipping...`)
        continue
      }

      const existingChat = await newChatManager.findById(oldChat.id)
      if (existingChat) {
        console.log(`Chat with ID ${oldChat.id} already migrated. Skipping...`)
        continue
      }

      await newChatManager.createChat({
        id: oldChat.id,
        title: oldChat.title,
        messages: oldChat.messages,
        createdAt: oldChat.createdAt,
        updatedAt: oldChat.updatedAt,
      })

      console.log(
        `Successfully migrated chat: ${oldChat.title} (${oldChat.id})`,
      )

      await oldChatManager.deleteChatConversation(oldChat.id)
    } catch (error) {
      console.error(`Error migrating chat ${chatMeta.id}:`, error)
    }
  }

  console.log('Chat history migration completed')
}
