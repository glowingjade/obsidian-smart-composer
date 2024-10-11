import debounce from 'lodash.debounce'
import isEqual from 'lodash.isequal'
import { App } from 'obsidian'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { editorStateToPlainText } from '../components/chat-input/utils/editor-state-to-plain-text'
import { useApp } from '../contexts/app-context'
import {
  ChatConversation,
  ChatConversationMeta,
  ChatMessage,
  SerializedChatMessage,
} from '../types/chat'
import { Mentionable, SerializedMentionable } from '../types/mentionable'
import { ChatConversationManager } from '../utils/chatHistoryManager'

const serializeMentionable = (
  mentionable: Mentionable,
): SerializedMentionable => {
  switch (mentionable.type) {
    case 'file':
      return {
        id: mentionable.id,
        type: 'file',
        file: mentionable.file.path,
      }
    case 'current-file':
      return {
        id: mentionable.id,
        type: 'current-file',
        file: mentionable.file?.path ?? null,
      }
    case 'block':
      return {
        id: mentionable.id,
        type: 'block',
        content: mentionable.content,
        file: mentionable.file.path,
        startLine: mentionable.startLine,
        endLine: mentionable.endLine,
      }
  }
}

const deserializeMentionable = (
  mentionable: SerializedMentionable,
  app: App,
): Mentionable | null => {
  try {
    switch (mentionable.type) {
      case 'file': {
        const file = app.vault.getFileByPath(mentionable.file)
        if (!file) {
          return null
        }
        return {
          id: mentionable.id,
          type: 'file',
          file: file,
        }
      }
      case 'current-file': {
        if (!mentionable.file) {
          return {
            id: mentionable.id,
            type: 'current-file',
            file: null,
          }
        }
        const file = app.vault.getFileByPath(mentionable.file)
        return {
          id: mentionable.id,
          type: 'current-file',
          file: file,
        }
      }
      case 'block': {
        const file = app.vault.getFileByPath(mentionable.file)
        if (!file) {
          return null
        }
        return {
          id: mentionable.id,
          type: 'block',
          content: mentionable.content,
          file: file,
          startLine: mentionable.startLine,
          endLine: mentionable.endLine,
        }
      }
    }
  } catch (e) {
    console.error('Error deserializing mentionable', e)
    return null
  }
}

const serializeChatMessage = (message: ChatMessage): SerializedChatMessage => {
  switch (message.role) {
    case 'user':
      return {
        role: 'user',
        content: message.content,
        id: message.id,
        mentionables: message.mentionables.map(serializeMentionable),
      }
    case 'assistant':
      return {
        role: 'assistant',
        content: message.content,
        id: message.id,
      }
  }
}

const deserializeChatMessage = (
  message: SerializedChatMessage,
  app: App,
): ChatMessage => {
  switch (message.role) {
    case 'user': {
      return {
        role: 'user',
        content: message.content,
        id: message.id,
        mentionables: message.mentionables
          .map((m) => deserializeMentionable(m, app))
          .filter((m): m is Mentionable => m !== null),
      }
    }
    case 'assistant':
      return {
        role: 'assistant',
        content: message.content,
        id: message.id,
      }
  }
}

export function useChatHistory() {
  const app = useApp()
  const chatConversationManager = useMemo(
    () => new ChatConversationManager(app),
    [app],
  )
  const [chatList, setChatList] = useState<ChatConversationMeta[]>([])

  const fetchChatList = async () => {
    const list = await chatConversationManager.getChatList()
    setChatList(list)
  }

  useEffect(() => {
    void fetchChatList()
  }, [])

  const createConversation =
    useCallback(async (): Promise<ChatConversation> => {
      const conversation =
        await chatConversationManager.createChatConversation()
      await fetchChatList()
      return conversation
    }, [chatConversationManager])

  const updateConversation = useCallback(
    debounce(
      async (id: string, messages: ChatMessage[]): Promise<void> => {
        const conversation =
          await chatConversationManager.findChatConversation(id)
        if (!conversation) {
          throw new Error('Conversation not found')
        }

        const serializedMessages = messages.map(serializeChatMessage)
        if (isEqual(conversation.messages, serializedMessages)) {
          return
        }

        const firstUserMessage = messages.find((v) => v.role === 'user')

        await chatConversationManager.saveChatConversation({
          ...conversation,
          title: firstUserMessage?.content
            ? editorStateToPlainText(firstUserMessage.content).substring(
                0,
                20,
              ) || 'New Chat'
            : 'New Chat',
          messages: serializedMessages,
          updatedAt: Date.now(),
        })
        await fetchChatList()
      },
      300,
      {
        maxWait: 1000,
      },
    ),
    [chatConversationManager],
  )

  const deleteConversation = useCallback(
    async (id: string): Promise<void> => {
      await chatConversationManager.deleteChatConversation(id)
      await fetchChatList()
    },
    [chatConversationManager],
  )

  const getChatMessagesById = useCallback(
    async (id: string): Promise<ChatMessage[] | null> => {
      const conversation =
        await chatConversationManager.findChatConversation(id)
      if (!conversation) {
        return null
      }
      return conversation.messages.map((message) =>
        deserializeChatMessage(message, app),
      )
    },
    [chatConversationManager, app],
  )

  return {
    createConversation,
    updateConversation,
    deleteConversation,
    getChatMessagesById,
    chatList,
  }
}
