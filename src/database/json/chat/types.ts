import { SerializedChatMessage } from '../../../types/chat'

export const CHAT_SCHEMA_VERSION = 1

export type ChatSettings = {
  systemPrompt: string
  systemPromptMode: 'append' | 'override'
}

export type ChatConversation = {
  id: string
  title: string
  messages: SerializedChatMessage[]
  createdAt: number
  updatedAt: number
  schemaVersion: number
  chatSettings?: ChatSettings
}

export type ChatConversationMetadata = {
  id: string
  title: string
  updatedAt: number
  schemaVersion: number
}
