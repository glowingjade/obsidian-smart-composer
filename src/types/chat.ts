import { SerializedEditorState } from 'lexical'

import { SelectEmbedding } from '../database/schema'

import { LLMModel } from './llm/model'
import { ContentPart } from './llm/request'
import { ResponseUsage } from './llm/response'
import { Mentionable, SerializedMentionable } from './mentionable'

export type ChatUserMessage = {
  role: 'user'
  content: SerializedEditorState | null
  promptContent: string | ContentPart[] | null
  id: string
  mentionables: Mentionable[]
  similaritySearchResults?: (Omit<SelectEmbedding, 'embedding'> & {
    similarity: number
  })[]
}
export type ChatAssistantMessage = {
  role: 'assistant'
  content: string
  id: string
  metadata?: {
    usage?: ResponseUsage
    model?: LLMModel
  }
}
export type ChatMessage = ChatUserMessage | ChatAssistantMessage

export type SerializedChatUserMessage = {
  role: 'user'
  content: SerializedEditorState | null
  promptContent: string | ContentPart[] | null
  id: string
  mentionables: SerializedMentionable[]
  similaritySearchResults?: (Omit<SelectEmbedding, 'embedding'> & {
    similarity: number
  })[]
}
export type SerializedChatAssistantMessage = {
  role: 'assistant'
  content: string
  id: string
  metadata?: {
    usage?: ResponseUsage
    model?: LLMModel
  }
}
export type SerializedChatMessage =
  | SerializedChatUserMessage
  | SerializedChatAssistantMessage
