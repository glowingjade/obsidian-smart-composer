/**
 * IMPORTANT: When modifying schema:
 * 1. Increment the schemaVersion in src/database/json/constants.ts
 * 2. Create a migration file in src/database/json/migrations/
 * 3. Add the migration to MIGRATIONS array in src/database/json/constants.ts
 */

import { SerializedChatMessage } from '../../../types/chat'
import { BaseDocument } from '../models/indexedFileStorage'

export type ChatDocument = {
  schemaVersion: number
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: SerializedChatMessage[]
} & BaseDocument

export type ChatIndex = {
  schemaVersion: number
  id: string
  title: string
  createdAt: number
  updatedAt: number
} & BaseDocument
