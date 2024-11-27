import debounce from 'lodash.debounce'
import isEqual from 'lodash.isequal'
import { App } from 'obsidian'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { editorStateToPlainText } from '../components/chat-view/chat-input/utils/editor-state-to-plain-text'
import { useApp } from '../contexts/app-context'
import {
  ChatConversationMeta,
  ChatMessage,
  SerializedChatMessage,
} from '../types/chat'
import { Mentionable } from '../types/mentionable'
import { ChatConversationManager } from '../utils/chatHistoryManager'
import {
  deserializeMentionable,
  serializeMentionable,
} from '../utils/mentionable'

type UseChatHistory = {
  createOrUpdateConversation: (
    id: string,
    messages: ChatMessage[],
  ) => Promise<void> | undefined
  deleteConversation: (id: string) => Promise<void>
  getChatMessagesById: (id: string) => Promise<ChatMessage[] | null>
  updateConversationTitle: (id: string, title: string) => Promise<void>
  chatList: ChatConversationMeta[]
}

export function useChatHistory(): UseChatHistory {
  const app = useApp()
  const chatConversationManager = useMemo(
    () => new ChatConversationManager(app),
    [app],
  )
  const [chatList, setChatList] = useState<ChatConversationMeta[]>([])

  const fetchChatList = useCallback(async () => {
    const list = await chatConversationManager.getChatList()
    setChatList(list)
  }, [chatConversationManager])

  useEffect(() => {
    void fetchChatList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createOrUpdateConversation = useMemo(
    () =>
      debounce(
        async (id: string, messages: ChatMessage[]): Promise<void> => {
          const serializedMessages = messages.map(serializeChatMessage)
          const existingConversation =
            await chatConversationManager.findChatConversation(id)

          if (existingConversation) {
            if (isEqual(existingConversation.messages, serializedMessages)) {
              return
            }
            await chatConversationManager.saveChatConversation({
              ...existingConversation,
              messages: serializedMessages,
              updatedAt: Date.now(),
            })
          } else {
            const newConversation =
              await chatConversationManager.createChatConversation(id)
            const firstUserMessage = messages.find((v) => v.role === 'user')

            await chatConversationManager.saveChatConversation({
              ...newConversation,
              title: firstUserMessage?.content
                ? editorStateToPlainText(firstUserMessage.content).substring(
                    0,
                    50,
                  )
                : 'New chat',
              messages: serializedMessages,
              updatedAt: Date.now(),
            })
          }

          await fetchChatList()
        },
        300,
        {
          maxWait: 1000,
        },
      ),
    [chatConversationManager, fetchChatList],
  )

  const deleteConversation = useCallback(
    async (id: string): Promise<void> => {
      await chatConversationManager.deleteChatConversation(id)
      await fetchChatList()
    },
    [chatConversationManager, fetchChatList],
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

  const updateConversationTitle = useCallback(
    async (id: string, title: string): Promise<void> => {
      const conversation =
        await chatConversationManager.findChatConversation(id)
      if (!conversation) {
        throw new Error('Conversation not found')
      }
      await chatConversationManager.saveChatConversation({
        ...conversation,
        title,
      })
      await fetchChatList()
    },
    [chatConversationManager, fetchChatList],
  )

  return {
    createOrUpdateConversation,
    deleteConversation,
    getChatMessagesById,
    updateConversationTitle,
    chatList,
  }
}

const serializeChatMessage = (message: ChatMessage): SerializedChatMessage => {
  switch (message.role) {
    case 'user':
      return {
        role: 'user',
        content: message.content,
        promptContent: message.promptContent,
        id: message.id,
        mentionables: message.mentionables.map(serializeMentionable),
        similaritySearchResults: message.similaritySearchResults,
      }
    case 'assistant':
      return {
        role: 'assistant',
        content: message.content,
        id: message.id,
        metadata: message.metadata,
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
        promptContent: message.promptContent,
        id: message.id,
        mentionables: message.mentionables
          .map((m) => deserializeMentionable(m, app))
          .filter((m): m is Mentionable => m !== null),
        similaritySearchResults: message.similaritySearchResults,
      }
    }
    case 'assistant':
      return {
        role: 'assistant',
        content: message.content,
        id: message.id,
        metadata: message.metadata,
      }
  }
}
