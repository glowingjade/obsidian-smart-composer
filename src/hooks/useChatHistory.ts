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

const serializeChatMessage = (message: ChatMessage): SerializedChatMessage => {
  switch (message.role) {
    case 'user':
      return {
        role: 'user',
        content: message.content,
        promptContent: message.promptContent,
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
        promptContent: message.promptContent,
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
          const conversation =
            (await chatConversationManager.findChatConversation(id)) ??
            (await chatConversationManager.createChatConversation(id))

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

  return {
    createOrUpdateConversation,
    deleteConversation,
    getChatMessagesById,
    chatList,
  }
}
