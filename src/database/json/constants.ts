import { m0000_InitChatDb } from './migrations/0000_init_chat_db'

export const DB_ROOT = '.smtcmp_json_db'

export const CHAT = {
  ROOT_DIR: 'chats',
  INDEX_FILE: 'index.json',
  DOCUMENTS_DIR: 'documents',
  SCHEMA_VERSION: 2,
} as const

export const MIGRATIONS_FILE = '_migrations.json'
export const MIGRATIONS = [m0000_InitChatDb]
