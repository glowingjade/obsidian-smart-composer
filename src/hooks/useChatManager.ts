import debounce from 'lodash.debounce'
import isEqual from 'lodash.isequal'
import { App } from 'obsidian'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { editorStateToPlainText } from '../components/chat-view/chat-input/utils/editor-state-to-plain-text'
import { useApp } from '../contexts/app-context'
import { ChatManager } from '../database/json/models/chat'
import { ChatIndex } from '../database/json/schemas/chat'
import { ChatMessage, SerializedChatMessage } from '../types/chat'
import { Mentionable } from '../types/mentionable'
import {
  deserializeMentionable,
  serializeMentionable,
} from '../utils/mentionable'

type UseChatManagerReturn = {
  createOrUpdateChat: (
    id: string,
    messages: ChatMessage[],
  ) => Promise<void> | undefined
  deleteChat: (id: string) => Promise<void>
  getChatMessagesById: (id: string) => Promise<ChatMessage[] | null>
  updateChatTitle: (id: string, title: string) => Promise<void>
  chatIndexList: ChatIndex[]
}

export function useChatManager(): UseChatManagerReturn {
  const app = useApp()
  const chatManager = useMemo(() => new ChatManager(app), [app])
  const [chatIndexList, setChatIndexList] = useState<ChatIndex[]>([])

  const fetchChatIndexList = useCallback(async () => {
    const list = await chatManager.getIndex()
    setChatIndexList(list)
  }, [chatManager])

  useEffect(() => {
    void fetchChatIndexList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createOrUpdateChat = useMemo(
    () =>
      debounce(
        async (id: string, messages: ChatMessage[]): Promise<void> => {
          const serializedMessages = messages.map(serializeChatMessage)
          const existingChat = await chatManager.findDocument(id)

          if (existingChat) {
            if (isEqual(existingChat.messages, serializedMessages)) {
              return
            }
            await chatManager.saveDocument({
              ...existingChat,
              messages: serializedMessages,
              updatedAt: Date.now(),
            })
          } else {
            const newChat = await chatManager.createChatDocument(id)
            const firstUserMessage = messages.find((v) => v.role === 'user')

            await chatManager.saveDocument({
              ...newChat,
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

          await fetchChatIndexList()
        },
        300,
        {
          maxWait: 1000,
        },
      ),
    [chatManager, fetchChatIndexList],
  )

  const deleteChat = useCallback(
    async (id: string): Promise<void> => {
      await chatManager.deleteDocument(id)
      await fetchChatIndexList()
    },
    [chatManager, fetchChatIndexList],
  )

  const getChatMessagesById = useCallback(
    async (id: string): Promise<ChatMessage[] | null> => {
      const chat = await chatManager.findDocument(id)
      if (!chat) {
        return null
      }
      return chat.messages.map((message) =>
        deserializeChatMessage(message, app),
      )
    },
    [chatManager, app],
  )

  const updateChatTitle = useCallback(
    async (id: string, title: string): Promise<void> => {
      const chat = await chatManager.findDocument(id)
      if (!chat) {
        throw new Error('Chat not found')
      }
      await chatManager.saveDocument({
        ...chat,
        title,
      })
      await fetchChatIndexList()
    },
    [chatManager, fetchChatIndexList],
  )

  return {
    createOrUpdateChat,
    deleteChat,
    getChatMessagesById,
    updateChatTitle,
    chatIndexList,
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
