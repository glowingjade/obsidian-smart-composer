/**
 * Migrates chat history files from legacy directory to new JSON database structure
 *
 * Directory structure changes:
 * Legacy:
 *   .smtcmp_chat_histories/
 *   ├── chat_list.json
 *   └── {id}.json files
 *
 * New:
 *   .smtcmp_json_db/
 *   └── chats/
 *       ├── index.json
 *       └── documents/
 *           └── {id}.json files
 *
 * This function handles the one-time migration of chat files to the new database location
 */

import { App, normalizePath } from 'obsidian'

import { Migration } from './types'

export const m0000_InitChatDb: Migration = {
  id: '0000_init_chat_db',
  description:
    'Migrates chat history files from legacy directory to new JSON database structure',
  up: (app: App) => migrateLegacyChatToJsonDb(app),
}

export async function migrateLegacyChatToJsonDb(app: App): Promise<void> {
  const OLD_CHAT_DIR = '.smtcmp_chat_histories'
  const OLD_CHAT_LIST_FILE = 'chat_list.json'
  const NEW_CHAT_DIR = '.smtcmp_json_db/chats'
  const NEW_CHAT_LIST_FILE = 'index.json'
  const NEW_CHAT_DOCUMENTS_DIR = 'documents'

  const oldChatDir = normalizePath(OLD_CHAT_DIR)
  const oldChatListPath = normalizePath(`${OLD_CHAT_DIR}/${OLD_CHAT_LIST_FILE}`)
  const newChatDir = normalizePath(NEW_CHAT_DIR)
  const newChatListPath = normalizePath(`${NEW_CHAT_DIR}/${NEW_CHAT_LIST_FILE}`)
  const newChatDocumentsDir = normalizePath(
    `${NEW_CHAT_DIR}/${NEW_CHAT_DOCUMENTS_DIR}`,
  )

  if (
    !(await app.vault.adapter.exists(oldChatDir)) ||
    (await app.vault.adapter.exists(newChatDir))
  ) {
    return
  }

  try {
    await app.vault.createFolder(newChatDir)
    await app.vault.createFolder(newChatDocumentsDir)

    if (await app.vault.adapter.exists(oldChatListPath)) {
      await app.vault.adapter.copy(oldChatListPath, newChatListPath)
    }

    const files = await app.vault.adapter.list(oldChatDir)
    for (const file of files.files) {
      const fileName = file.split('/').pop()
      if (
        fileName?.endsWith('.json') &&
        !fileName.endsWith(OLD_CHAT_LIST_FILE)
      ) {
        await app.vault.adapter.copy(
          normalizePath(`${oldChatDir}/${fileName}`),
          normalizePath(`${newChatDocumentsDir}/${fileName}`),
        )
      }
    }

    await app.vault.adapter.rmdir(oldChatDir, true)
  } catch (error) {
    console.error('Failed to migrate chat directory:', error)
    throw error
  }
}
