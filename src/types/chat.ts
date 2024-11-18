import { SerializedEditorState } from 'lexical'

import { SelectVector } from '../database/schema'

import { Mentionable, SerializedMentionable } from './mentionable'

export type ChatUserMessage = {
  role: 'user'
  content: SerializedEditorState | null
  promptContent: string | null
  id: string
  mentionables: Mentionable[]
  similaritySearchResults?: (Omit<SelectVector, 'embedding'> & {
    similarity: number
  })[]
}
export type ChatAssistantMessage = {
  role: 'assistant'
  content: string
  id: string
}
export type ChatMessage = ChatUserMessage | ChatAssistantMessage

export type SerializedChatUserMessage = {
  role: 'user'
  content: SerializedEditorState | null
  promptContent: string | null
  id: string
  mentionables: SerializedMentionable[]
  similaritySearchResults?: (Omit<SelectVector, 'embedding'> & {
    similarity: number
  })[]
}
export type SerializedChatAssistantMessage = {
  role: 'assistant'
  content: string
  id: string
}
export type SerializedChatMessage =
  | SerializedChatUserMessage
  | SerializedChatAssistantMessage

export type ChatConversation = {
  schemaVersion: number
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: SerializedChatMessage[]
}
export type ChatConversationMeta = {
  schemaVersion: number
  id: string
  title: string
  createdAt: number
  updatedAt: number
}
