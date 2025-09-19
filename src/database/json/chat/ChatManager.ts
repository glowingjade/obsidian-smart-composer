import { App, normalizePath } from 'obsidian'
import { v4 as uuidv4 } from 'uuid'

import { AbstractJsonRepository } from '../base'
import { CHAT_DIR, ROOT_DIR } from '../constants'
import { EmptyChatTitleException } from '../exception'

import {
  CHAT_SCHEMA_VERSION,
  ChatConversation,
  ChatConversationMetadata,
} from './types'

// Maximum filename length to avoid ENAMETOOLONG error
// Most file systems have 255 byte limit, we use 200 to be safe
const MAX_FILENAME_LENGTH = 200

// Maximum chat title length to prevent extremely long titles
const MAX_CHAT_TITLE_LENGTH = 100

/**
 * Creates a safe filename by truncating long titles and using hash for uniqueness
 */
function createSafeEncodedTitle(title: string): string {
  const encoded = encodeURIComponent(title)

  if (encoded.length <= 50) {
    return encoded
  }

  // For long titles, use first part + hash for uniqueness
  const hashInput = title
  const hash = hashInput
    .split('')
    .reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a // Convert to 32-bit integer
    }, 0)
    .toString(16)
    .replace('-', 'n') // Replace negative sign with 'n'

  const truncated = encoded.substring(0, 30)
  return `${truncated}...${hash}`
}

/**
 * Validates and sanitizes chat title
 */
function validateAndSanitizeChatTitle(title: string): string {
  if (!title || title.trim().length === 0) {
    throw new EmptyChatTitleException()
  }

  const trimmedTitle = title.trim()

  // If title is too long, truncate it with ellipsis
  if (trimmedTitle.length > MAX_CHAT_TITLE_LENGTH) {
    return trimmedTitle.substring(0, MAX_CHAT_TITLE_LENGTH - 3) + '...'
  }

  return trimmedTitle
}

export class ChatManager extends AbstractJsonRepository<
  ChatConversation,
  ChatConversationMetadata
> {
  constructor(app: App) {
    super(app, `${ROOT_DIR}/${CHAT_DIR}`)
  }

  /**
   * Override create method to handle filename length errors with retry
   */
  public async create(chat: ChatConversation): Promise<void> {
    try {
      await super.create(chat)
    } catch (error: any) {
      // Handle ENAMETOOLONG error by shortening the title and retrying
      if (error.message && error.message.includes('ENAMETOOLONG')) {
        console.warn('Filename too long, retrying with shortened title:', chat.title)

        // Create a new chat object with a shortened title
        const shortenedChat: ChatConversation = {
          ...chat,
          title: chat.title.substring(0, 20) + '...',
        }

        // Try again with the shortened title
        await super.create(shortenedChat)
      } else {
        // Re-throw other errors
        throw error
      }
    }
  }

  /**
   * Override update method to handle filename length errors with retry
   */
  public async update(oldChat: ChatConversation, newChat: ChatConversation): Promise<void> {
    try {
      await super.update(oldChat, newChat)
    } catch (error: any) {
      // Handle ENAMETOOLONG error by shortening the title and retrying
      if (error.message && error.message.includes('ENAMETOOLONG')) {
        console.warn('Filename too long during update, retrying with shortened title:', newChat.title)

        // Create a new chat object with a shortened title
        const shortenedChat: ChatConversation = {
          ...newChat,
          title: newChat.title.substring(0, 20) + '...',
        }

        // Try again with the shortened title
        await super.update(oldChat, shortenedChat)
      } else {
        // Re-throw other errors
        throw error
      }
    }
  }

  protected generateFileName(chat: ChatConversation): string {
    // Format: v{schemaVersion}_{title}_{updatedAt}_{id}.json
    const safeEncodedTitle = createSafeEncodedTitle(chat.title)
    const fileName = `v${chat.schemaVersion}_${safeEncodedTitle}_${chat.updatedAt}_${chat.id}.json`

    // Final safety check - if still too long, use shortened version
    if (fileName.length > MAX_FILENAME_LENGTH) {
      const shortTitle = createSafeEncodedTitle(chat.title.substring(0, 10))
      return `v${chat.schemaVersion}_${shortTitle}_${chat.updatedAt}_${chat.id}.json`
    }

    return fileName
  }

  protected parseFileName(fileName: string): ChatConversationMetadata | null {
    // Parse: v{schemaVersion}_{title}_{updatedAt}_{id}.json
    const regex = new RegExp(
      `^v${CHAT_SCHEMA_VERSION}_(.+)_(\\d+)_([0-9a-f-]+)\\.json$`,
    )
    const match = fileName.match(regex)
    if (!match) return null

    try {
      const encodedTitle = match[1]
      // For hashed/truncated titles, we'll get the actual title from the file content
      // For now, we decode what we have
      let title: string
      if (encodedTitle.includes('...')) {
        // This is a truncated/hashed title, we'll use a placeholder
        // The actual title will be read from the file content
        title = 'Loading...'
      } else {
        title = decodeURIComponent(encodedTitle)
      }

      const updatedAt = parseInt(match[2], 10)
      const id = match[3]

      return {
        id,
        schemaVersion: CHAT_SCHEMA_VERSION,
        title,
        updatedAt,
      }
    } catch (error) {
      // If decoding fails, return null to skip this file
      console.warn('Failed to parse filename:', fileName, error)
      return null
    }
  }

  public async createChat(
    initialData: Partial<ChatConversation>,
  ): Promise<ChatConversation> {
    // Validate and sanitize the title if provided
    const sanitizedTitle = initialData.title !== undefined ?
      validateAndSanitizeChatTitle(initialData.title) :
      'New chat'

    const now = Date.now()
    const newChat: ChatConversation = {
      id: uuidv4(),
      messages: [],
      createdAt: now,
      updatedAt: now,
      schemaVersion: CHAT_SCHEMA_VERSION,
      ...initialData,
      // Override with sanitized title
      title: sanitizedTitle,
    }

    await this.create(newChat)
    return newChat
  }

  public async findById(id: string): Promise<ChatConversation | null> {
    const allMetadata = await this.listMetadata()
    const targetMetadata = allMetadata.find((meta) => meta.id === id)

    if (!targetMetadata) return null

    return this.read(targetMetadata.fileName)
  }

  public async updateChat(
    id: string,
    updates: Partial<
      Omit<ChatConversation, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'>
    >,
  ): Promise<ChatConversation | null> {
    const chat = await this.findById(id)
    if (!chat) return null

    // Validate and sanitize title if it's being updated
    const sanitizedUpdates = { ...updates }
    if (updates.title !== undefined) {
      sanitizedUpdates.title = validateAndSanitizeChatTitle(updates.title)
    }

    const updatedChat: ChatConversation = {
      ...chat,
      ...sanitizedUpdates,
      updatedAt: Date.now(),
    }

    await this.update(chat, updatedChat)
    return updatedChat
  }

  public async deleteChat(id: string): Promise<boolean> {
    const allMetadata = await this.listMetadata()
    const targetMetadata = allMetadata.find((meta) => meta.id === id)
    if (!targetMetadata) return false

    await this.delete(targetMetadata.fileName)
    return true
  }

  public async listChats(): Promise<ChatConversationMetadata[]> {
    const metadata = await this.listMetadata()

    // For truncated titles, we need to read the actual title from file content
    const updatedMetadata = await Promise.all(
      metadata.map(async (meta) => {
        if (meta.title === 'Loading...') {
          // Read the actual chat to get the real title
          const chat = await this.read(meta.fileName)
          if (chat) {
            return {
              ...meta,
              title: chat.title,
            }
          }
        }
        return meta
      }),
    )

    return updatedMetadata.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  /**
   * Migration utility to fix existing files with overly long names
   * This should be called once to fix existing problematic files
   */
  public async migrateExistingLongFilenames(): Promise<void> {
    try {
      console.log('Starting migration of long filenames...')

      // List all files in the chat directory directly
      const dirContents = await this.app.vault.adapter.list(`${ROOT_DIR}/${CHAT_DIR}`)

      let migratedCount = 0
      for (const filePath of dirContents.files) {
        const fileName = filePath.split('/').pop() || ''

        // Skip if filename is reasonable length
        if (fileName.length <= MAX_FILENAME_LENGTH) {
          continue
        }

        // Skip non-JSON files
        if (!fileName.endsWith('.json')) {
          continue
        }

        console.log(`Migrating long filename: ${fileName.substring(0, 100)}...`)

        try {
          // Read the existing file content
          const content = await this.app.vault.adapter.read(filePath)
          const chat: ChatConversation = JSON.parse(content)

          // Generate a new safe filename
          const newFileName = this.generateFileName(chat)
          const newFilePath = normalizePath(`${ROOT_DIR}/${CHAT_DIR}/${newFileName}`)

          // Only migrate if the new filename is different and shorter
          if (newFileName !== fileName && newFileName.length < fileName.length) {
            // Write to new location
            await this.app.vault.adapter.write(newFilePath, content)

            // Delete old file
            await this.app.vault.adapter.remove(filePath)

            migratedCount++
            console.log(`Successfully migrated: ${fileName.substring(0, 50)}... -> ${newFileName}`)
          }
        } catch (error) {
          console.error(`Failed to migrate file ${fileName}:`, error)
          // Continue with other files
        }
      }

      console.log(`Migration completed. Migrated ${migratedCount} files.`)
    } catch (error) {
      console.error('Migration failed:', error)
      throw error
    }
  }
}
