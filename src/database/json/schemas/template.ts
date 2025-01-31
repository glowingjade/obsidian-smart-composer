/**
 * IMPORTANT: When modifying schema:
 * 1. Increment the schemaVersion in src/database/json/constants.ts
 * 2. Create a migration file in src/database/json/migrations/
 * 3. Add the migration to MIGRATIONS array in src/database/json/constants.ts
 */

import { SerializedLexicalNode } from 'lexical'

import { BaseDocument } from '../models/indexedFileStorage'

type TemplateContent = {
  nodes: SerializedLexicalNode[]
}

export type TemplateDocument = {
  name: string
  content: TemplateContent
} & BaseDocument

export type TemplateIndex = {
  name: string
} & BaseDocument
