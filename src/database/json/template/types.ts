import { SerializedLexicalNode } from 'lexical'

export const TEMPLATE_SCHEMA_VERSION = 1

export type Template = {
  id: string
  name: string
  content: { nodes: SerializedLexicalNode[] }
  createdAt: number
  updatedAt: number
  schemaVersion: number
}

export type TemplateMetadata = {
  id: string
  name: string
  schemaVersion: number
}
