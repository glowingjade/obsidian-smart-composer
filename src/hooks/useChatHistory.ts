import debounce from 'lodash.debounce'
import isEqual from 'lodash.isequal'
import { App } from 'obsidian'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { editorStateToPlainText } from '../components/chat-view/chat-input/utils/editor-state-to-plain-text'
import { useApp } from '../contexts/app-context'
import {
  ChatConversationMetadata,
  ChatSettings,
} from '../database/json/chat/types'
import { ChatMessage, SerializedChatMessage } from '../types/chat'
import { Mentionable } from '../types/mentionable'
import {
  deserializeMentionable,
  serializeMentionable,
} from '../utils/chat/mentionable'

import { useChatManager } from './useJsonManagers'

type ConversationData = {
  messages: ChatMessage[]
  chatSettings?: ChatSettings
}

type UseChatHistory = {
  createOrUpdateConversation: (
    id: string,
    messages: ChatMessage[],
    chatSettings?: ChatSettings,
  ) => Promise<void> | undefined
  deleteConversation: (id: string) => Promise<void>
  getConversationById: (id: string) => Promise<ConversationData | null>
  updateConversationTitle: (id: string, title: string) => Promise<void>
  chatList: ChatConversationMetadata[]
}

export function useChatHistory(): UseChatHistory {
  const app = useApp()
  const chatManager = useChatManager()
  const [chatList, setChatList] = useState<ChatConversationMetadata[]>([])

  const fetchChatList = useCallback(async () => {
    const list = await chatManager.listChats()
    setChatList(list)
  }, [chatManager])

  useEffect(() => {
    void fetchChatList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createOrUpdateConversation = useMemo(
    () =>
      debounce(
        async (
          id: string,
          messages: ChatMessage[],
          chatSettings?: ChatSettings,
        ): Promise<void> => {
          const serializedMessages = messages.map(serializeChatMessage)
          const existingConversation = await chatManager.findById(id)

          if (existingConversation) {
            if (
              isEqual(existingConversation.messages, serializedMessages) &&
              isEqual(existingConversation.chatSettings, chatSettings)
            ) {
              return
            }
            await chatManager.updateChat(existingConversation.id, {
              messages: serializedMessages,
              chatSettings,
            })
          } else {
            const firstUserMessage = messages.find((v) => v.role === 'user')

            await chatManager.createChat({
              id,
              title: firstUserMessage?.content
                ? editorStateToPlainText(firstUserMessage.content).substring(
                    0,
                    50,
                  )
                : 'New chat',
              messages: serializedMessages,
              chatSettings,
            })
          }

          await fetchChatList()
        },
        300,
        {
          maxWait: 1000,
        },
      ),
    [chatManager, fetchChatList],
  )

  const deleteConversation = useCallback(
    async (id: string): Promise<void> => {
      await chatManager.deleteChat(id)
      await fetchChatList()
    },
    [chatManager, fetchChatList],
  )

  const getConversationById = useCallback(
    async (id: string): Promise<ConversationData | null> => {
      const conversation = await chatManager.findById(id)
      if (!conversation) {
        return null
      }
      return {
        messages: conversation.messages.map((message) =>
          deserializeChatMessage(message, app),
        ),
        chatSettings: conversation.chatSettings,
      }
    },
    [chatManager, app],
  )

  const updateConversationTitle = useCallback(
    async (id: string, title: string): Promise<void> => {
      if (title.length === 0) {
        throw new Error('Chat title cannot be empty')
      }
      const conversation = await chatManager.findById(id)
      if (!conversation) {
        throw new Error('Conversation not found')
      }
      await chatManager.updateChat(conversation.id, {
        title,
      })
      await fetchChatList()
    },
    [chatManager, fetchChatList],
  )

  return {
    createOrUpdateConversation,
    deleteConversation,
    getConversationById,
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
        reasoning: message.reasoning,
        annotations: message.annotations,
        toolCallRequests: message.toolCallRequests,
        id: message.id,
        metadata: message.metadata,
        providerMetadata: message.providerMetadata,
      }
    case 'tool':
      return {
        role: 'tool',
        toolCalls: message.toolCalls,
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
        similaritySearchResults: message.similaritySearchResults,
      }
    }
    case 'assistant':
      return {
        role: 'assistant',
        content: message.content,
        reasoning: message.reasoning,
        annotations: message.annotations,
        toolCallRequests: message.toolCallRequests,
        id: message.id,
        metadata: message.metadata,
        providerMetadata: message.providerMetadata,
      }
    case 'tool':
      return {
        role: 'tool',
        toolCalls: message.toolCalls,
        id: message.id,
      }
  }
}
