import { useMutation } from '@tanstack/react-query'
import { History, Plus } from 'lucide-react'
import { App, Notice } from 'obsidian'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { v4 as uuidv4 } from 'uuid'

import { ApplyViewState } from '../ApplyView'
import { APPLY_VIEW_TYPE } from '../constants'
import { useApp } from '../contexts/app-context'
import { useLLM } from '../contexts/llm-context'
import { useSettings } from '../contexts/settings-context'
import { useChatHistory } from '../hooks/useChatHistory'
import { ChatMessage, ChatUserMessage } from '../types/chat'
import { RequestMessage } from '../types/llm/request'
import {
  MentionableBlock,
  MentionableBlockData,
  MentionableCurrentFile,
} from '../types/mentionable'
import { applyChangesToFile } from '../utils/apply'
import { readTFileContent } from '../utils/obsidian'
import { parseRequestMessages } from '../utils/prompt'

import ChatUserInput, { ChatUserInputRef } from './chat-input/ChatUserInput'
import { editorStateToPlainText } from './chat-input/utils/editor-state-to-plain-text'
import { generateMentionableId } from './chat-input/utils/get-mentionable-id'
import { ChatListDropdown } from './ChatListDropdown'
import ReactMarkdown from './ReactMarkdown'

// Add an empty line here
const getNewInputMessage = (app: App): ChatUserMessage => {
  const mentionable: Omit<MentionableCurrentFile, 'id'> = {
    type: 'current-file',
    file: app.workspace.getActiveFile(),
  }
  return {
    role: 'user',
    content: null,
    id: uuidv4(),
    mentionables: [
      {
        id: generateMentionableId(mentionable),
        ...mentionable,
      },
    ],
  }
}

export type ChatRef = {
  addSelectionToChat: (data: MentionableBlockData) => void
  focusMessage: () => void
}

export type ChatProps = {
  selectedBlock?: MentionableBlockData
}

const Chat = forwardRef<ChatRef, ChatProps>((props, ref) => {
  const app = useApp()
  const { settings } = useSettings()

  const {
    createConversation,
    updateConversation,
    deleteConversation,
    getChatMessagesById,
    chatList,
  } = useChatHistory()
  const { generateResponse, streamResponse } = useLLM()

  const [inputMessage, setInputMessage] = useState<ChatUserMessage>(() => {
    const newMessage = getNewInputMessage(app)
    if (props.selectedBlock) {
      const blockMentionable: Omit<MentionableBlock, 'id'> = {
        type: 'block',
        ...props.selectedBlock,
      }
      newMessage.mentionables = [
        ...newMessage.mentionables,
        {
          id: generateMentionableId(blockMentionable),
          ...blockMentionable,
        },
      ]
    }
    return newMessage
  })
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [focusedMessageId, setFocusedMessageId] = useState<string | null>(null)
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null)
  const activeStreamAbortControllersRef = useRef<AbortController[]>([])
  const chatUserInputRefs = useRef<Map<string, ChatUserInputRef>>(new Map())
  const chatMessagesRef = useRef<HTMLDivElement>(null)
  const registerChatUserInputRef = (
    id: string,
    ref: ChatUserInputRef | null,
  ) => {
    if (ref) {
      chatUserInputRefs.current.set(id, ref)
    } else {
      chatUserInputRefs.current.delete(id)
    }
  }

  const handleScrollToBottom = () => {
    if (chatMessagesRef.current) {
      const scrollContainer = chatMessagesRef.current
      if (scrollContainer.scrollTop !== scrollContainer.scrollHeight) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }

  const abortActiveStreams = () => {
    for (const abortController of activeStreamAbortControllersRef.current) {
      abortController.abort()
    }
    activeStreamAbortControllersRef.current = []
  }

  const handleLoadConversation = async (conversationId: string) => {
    try {
      abortActiveStreams()
      const conversation = await getChatMessagesById(conversationId)
      if (!conversation) {
        throw new Error('Conversation not found')
      }
      setCurrentConversationId(conversationId)
      setChatMessages(conversation)
      const newInputMessage = getNewInputMessage(app)
      setInputMessage(newInputMessage)
      setFocusedMessageId(newInputMessage.id)
    } catch (error) {
      new Notice('Failed to load conversation')
      console.error('Failed to load conversation', error)
    }
  }

  const handleNewChat = async () => {
    setCurrentConversationId(null)
    setChatMessages([])
    const newInputMessage = getNewInputMessage(app)
    setInputMessage(newInputMessage)
    setFocusedMessageId(newInputMessage.id)
    abortActiveStreams()
  }

  const submitMutation = useMutation({
    mutationFn: async (newChatHistory: ChatMessage[]) => {
      abortActiveStreams()

      const responseMessageId = uuidv4()
      setChatMessages([
        ...newChatHistory,
        { role: 'assistant', content: '', id: responseMessageId },
      ])

      try {
        const abortController = new AbortController()
        activeStreamAbortControllersRef.current.push(abortController)

        const requestMessages = await parseRequestMessages(
          newChatHistory,
          app.vault,
        )

        const stream = await streamResponse(
          {
            model: settings.chatModel,
            messages: requestMessages as RequestMessage[],
            stream: true,
          },
          {
            signal: abortController.signal,
          },
        )

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content ?? ''
          setChatMessages((prevChatHistory) =>
            prevChatHistory.map((message) =>
              message.role === 'assistant' && message.id === responseMessageId
                ? { ...message, content: message.content + content }
                : message,
            ),
          )
          handleScrollToBottom()
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        } else {
          throw new Error('Failed to generate response')
        }
      }
    },
    onError: (error) => {
      new Notice(error.message)
      console.error('Failed to generate response', error)
    },
  })

  const handleSubmit = (newChatHistory: ChatMessage[]) => {
    submitMutation.mutate(newChatHistory)
  }

  const applyMutation = useMutation({
    mutationFn: async ({
      blockToApply,
      chatMessages,
    }: {
      blockToApply: string
      chatMessages: ChatMessage[]
    }) => {
      const activeFile = app.workspace.getActiveFile()
      if (!activeFile) {
        throw new Error('File not found')
      }
      const activeFileContent = await readTFileContent(activeFile, app.vault)

      const updatedFileContent = await applyChangesToFile(
        blockToApply,
        activeFile,
        activeFileContent,
        chatMessages,
        settings.applyModel,
        generateResponse,
      )
      if (!updatedFileContent) {
        throw new Error('Failed to apply changes')
      }

      await app.workspace.getLeaf(true).setViewState({
        type: APPLY_VIEW_TYPE,
        active: true,
        state: {
          file: activeFile,
          originalContent: activeFileContent,
          newContent: updatedFileContent,
        } satisfies ApplyViewState,
      })
    },
    onError: (error) => {
      new Notice(error.message)
      console.error('Failed to apply changes', error)
    },
  })

  const handleApply = (blockToApply: string, chatMessages: ChatMessage[]) => {
    applyMutation.mutate({ blockToApply, chatMessages })
  }

  useEffect(() => {
    setFocusedMessageId(inputMessage.id)
  }, [])

  useEffect(() => {
    const updateConversationAsync = async () => {
      try {
        if (chatMessages.length > 0) {
          if (!currentConversationId) {
            const newConversation = await createConversation()
            setCurrentConversationId(newConversation.id)
            updateConversation(newConversation.id, chatMessages)
          } else {
            updateConversation(currentConversationId, chatMessages)
          }
        }
      } catch (error) {
        new Notice('Failed to save chat history')
        console.error('Failed to save chat history', error)
      }
    }
    updateConversationAsync()
  }, [chatMessages, currentConversationId])

  // Updates the currentFile of the focused message (input or chat history)
  // This happens when active file changes or focused message changes
  const handleActiveLeafChange = useCallback(() => {
    const activeFile = app.workspace.getActiveFile()
    if (!activeFile) return

    const mentionable: Omit<MentionableCurrentFile, 'id'> = {
      type: 'current-file',
      file: activeFile,
    }

    if (!focusedMessageId) return
    if (inputMessage.id === focusedMessageId) {
      setInputMessage((prevInputMessage) => ({
        ...prevInputMessage,
        mentionables: [
          {
            id: generateMentionableId(mentionable),
            ...mentionable,
          },
          ...prevInputMessage.mentionables.filter(
            (mentionable) => mentionable.type !== 'current-file',
          ),
        ],
      }))
    } else {
      setChatMessages((prevChatHistory) =>
        prevChatHistory.map((message) =>
          message.id === focusedMessageId && message.role === 'user'
            ? {
                ...message,
                mentionables: [
                  {
                    id: generateMentionableId(mentionable),
                    ...mentionable,
                  },
                  ...message.mentionables.filter(
                    (mentionable) => mentionable.type !== 'current-file',
                  ),
                ],
              }
            : message,
        ),
      )
    }
  }, [app.workspace, focusedMessageId, inputMessage.id])

  useEffect(() => {
    app.workspace.on('active-leaf-change', handleActiveLeafChange)
    return () => {
      app.workspace.off('active-leaf-change', handleActiveLeafChange)
    }
  }, [app.workspace, handleActiveLeafChange])

  useImperativeHandle(ref, () => ({
    addSelectionToChat(data: MentionableBlockData) {
      const mentionable: Omit<MentionableBlock, 'id'> = {
        type: 'block',
        ...data,
      }

      if (focusedMessageId === inputMessage.id) {
        setInputMessage((prevInputMessage) => ({
          ...prevInputMessage,
          mentionables: [
            ...prevInputMessage.mentionables,
            {
              id: generateMentionableId(mentionable),
              ...mentionable,
            },
          ],
        }))
      } else {
        setChatMessages((prevChatHistory) =>
          prevChatHistory.map((message) =>
            message.id === focusedMessageId && message.role === 'user'
              ? {
                  ...message,
                  mentionables: [
                    ...message.mentionables,
                    {
                      id: generateMentionableId(mentionable),
                      ...mentionable,
                    },
                  ],
                }
              : message,
          ),
        )
      }
    },
    focusMessage: () => {
      if (!focusedMessageId) return
      chatUserInputRefs.current.get(focusedMessageId)?.focus()
    },
  }))

  return (
    <div className="smtcmp-chat-container">
      <div className="smtcmp-chat-header">
        <h1 className="smtcmp-chat-header-title">
          Chat ({settings.chatModel})
        </h1>
        <div className="smtcmp-chat-header-buttons">
          <button
            onClick={() => void handleNewChat()}
            className="smtcmp-chat-list-dropdown"
          >
            <Plus size={18} />
          </button>
          <ChatListDropdown
            chatList={chatList}
            onSelectConversation={(conversationId) =>
              void handleLoadConversation(conversationId)
            }
            onDeleteConversation={(conversationId) => {
              void deleteConversation(conversationId)
              if (conversationId === currentConversationId) {
                const nextConversation = chatList.find(
                  (chat) => chat.id !== conversationId,
                )
                if (nextConversation) {
                  void handleLoadConversation(nextConversation.id)
                } else {
                  void handleNewChat()
                }
              }
            }}
            className="smtcmp-chat-list-dropdown"
          >
            <History size={18} />
          </ChatListDropdown>
        </div>
      </div>
      <div className="smtcmp-chat-messages" ref={chatMessagesRef}>
        {chatMessages.map((message, index) =>
          message.role === 'user' ? (
            <ChatUserInput
              key={index}
              ref={(ref) => registerChatUserInputRef(message.id, ref)}
              message={message.content}
              onChange={(content) => {
                setChatMessages((prevChatHistory) =>
                  prevChatHistory.map((msg) =>
                    msg.role === 'user' && msg.id === message.id
                      ? {
                          ...msg,
                          content,
                        }
                      : msg,
                  ),
                )
              }}
              onSubmit={(content) => {
                if (editorStateToPlainText(content).trim() === '') return
                handleSubmit([
                  ...chatMessages.slice(0, index),
                  {
                    ...message,
                    content,
                  },
                ])
                chatUserInputRefs.current.get(inputMessage.id)?.focus()
              }}
              onFocus={() => {
                setFocusedMessageId(message.id)
              }}
              mentionables={message.mentionables}
              setMentionables={(mentionables) => {
                setChatMessages((prevChatHistory) =>
                  prevChatHistory.map((msg) =>
                    msg.id === message.id ? { ...msg, mentionables } : msg,
                  ),
                )
              }}
            />
          ) : (
            <div key={index}>
              <ReactMarkdown
                onApply={(blockToApply: string) => {
                  handleApply(blockToApply, chatMessages.slice(0, index + 1))
                }}
                isApplying={applyMutation.isPending}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          ),
        )}
      </div>
      <ChatUserInput
        key={inputMessage.id}
        ref={(ref) => registerChatUserInputRef(inputMessage.id, ref)}
        message={inputMessage.content}
        onChange={(content) => {
          setInputMessage((prevInputMessage) => ({
            ...prevInputMessage,
            content,
          }))
        }}
        onSubmit={(content) => {
          if (editorStateToPlainText(content).trim() === '') return
          handleSubmit([...chatMessages, { ...inputMessage, content }])
          chatUserInputRefs.current.get(inputMessage.id)?.clear()
          setInputMessage(getNewInputMessage(app))
          handleScrollToBottom()
        }}
        onFocus={() => {
          setFocusedMessageId(inputMessage.id)
        }}
        mentionables={inputMessage.mentionables}
        setMentionables={(mentionables) => {
          setInputMessage((prevInputMessage) => ({
            ...prevInputMessage,
            mentionables,
          }))
        }}
        autoFocus
      />
    </div>
  )
})

export default Chat
