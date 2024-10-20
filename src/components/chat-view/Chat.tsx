import { useMutation } from '@tanstack/react-query'
import { History, Plus } from 'lucide-react'
import { App, Notice } from 'obsidian'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { v4 as uuidv4 } from 'uuid'

import { ApplyViewState } from '../../ApplyView'
import { APPLY_VIEW_TYPE } from '../../constants'
import { useApp } from '../../contexts/app-context'
import { useLLM } from '../../contexts/llm-context'
import { useRAG } from '../../contexts/rag-context'
import { useSettings } from '../../contexts/settings-context'
import { useChatHistory } from '../../hooks/useChatHistory'
import { OpenSettingsModal } from '../../OpenSettingsModal'
import { ChatMessage, ChatUserMessage } from '../../types/chat'
import {
  MentionableBlock,
  MentionableBlockData,
  MentionableCurrentFile,
} from '../../types/mentionable'
import { applyChangesToFile } from '../../utils/apply'
import {
  LLMAPIKeyInvalidException,
  LLMAPIKeyNotSetException,
} from '../../utils/llm/exception'
import { readTFileContent } from '../../utils/obsidian'
import { PromptGenerator } from '../../utils/promptGenerator'

import ChatUserInput, { ChatUserInputRef } from './chat-input/ChatUserInput'
import { editorStateToPlainText } from './chat-input/utils/editor-state-to-plain-text'
import { ChatListDropdown } from './ChatListDropdown'
import QueryProgress, { QueryProgressState } from './QueryProgress'
import ReactMarkdown from './ReactMarkdown'

// Add an empty line here
const getNewInputMessage = (app: App): ChatUserMessage => {
  return {
    role: 'user',
    content: null,
    parsedContent: null,
    id: uuidv4(),
    mentionables: [
      {
        type: 'current-file',
        file: app.workspace.getActiveFile(),
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
  const { ragEngine } = useRAG()

  const {
    createOrUpdateConversation,
    deleteConversation,
    getChatMessagesById,
    chatList,
  } = useChatHistory()
  const { generateResponse, streamResponse } = useLLM()

  const promptGenerator: PromptGenerator | null = useMemo(() => {
    if (!ragEngine) {
      return null
    }
    return new PromptGenerator(ragEngine, app, settings)
  }, [ragEngine, app, settings])

  const [inputMessage, setInputMessage] = useState<ChatUserMessage>(() => {
    const newMessage = getNewInputMessage(app)
    if (props.selectedBlock) {
      newMessage.mentionables = [
        ...newMessage.mentionables,
        {
          type: 'block',
          ...props.selectedBlock,
        },
      ]
    }
    return newMessage
  })
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [focusedMessageId, setFocusedMessageId] = useState<string | null>(null)
  const [currentConversationId, setCurrentConversationId] =
    useState<string>(uuidv4())
  const [queryProgress, setQueryProgress] = useState<QueryProgressState>({
    type: 'idle',
  })
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
      setQueryProgress({
        type: 'idle',
      })
    } catch (error) {
      new Notice('Failed to load conversation')
      console.error('Failed to load conversation', error)
    }
  }

  const handleNewChat = async () => {
    setCurrentConversationId(uuidv4())
    setChatMessages([])
    const newInputMessage = getNewInputMessage(app)
    setInputMessage(newInputMessage)
    setFocusedMessageId(newInputMessage.id)
    setQueryProgress({
      type: 'idle',
    })
    abortActiveStreams()
  }

  const submitMutation = useMutation({
    mutationFn: async ({
      newChatHistory,
    }: {
      newChatHistory: ChatMessage[]
    }) => {
      abortActiveStreams()
      setQueryProgress({
        type: 'idle',
      })

      if (!promptGenerator) {
        throw new Error('Prompt generator is not initialized')
      }

      const responseMessageId = uuidv4()
      setChatMessages([
        ...newChatHistory,
        { role: 'assistant', content: '', id: responseMessageId },
      ])

      try {
        const abortController = new AbortController()
        activeStreamAbortControllersRef.current.push(abortController)

        const { requestMessages, parsedMessages } =
          await promptGenerator.generateRequestMessages(
            newChatHistory,
            (queryProgress) => {
              console.log('queryProgress', queryProgress)
              setQueryProgress(queryProgress)
            },
          )
        setQueryProgress({
          type: 'idle',
        })

        setChatMessages([
          ...parsedMessages,
          { role: 'assistant', content: '', id: responseMessageId },
        ])
        const stream = await streamResponse(
          {
            model: settings.chatModel,
            messages: requestMessages,
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
          throw error
        }
      }
    },
    onError: (error) => {
      setQueryProgress({
        type: 'idle',
      })
      if (
        error instanceof LLMAPIKeyNotSetException ||
        error instanceof LLMAPIKeyInvalidException
      ) {
        new OpenSettingsModal(app, error.message, () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const setting = (app as any).setting
          setting.open()
          setting.openTabById('smart-composer')
        }).open()
      } else {
        new Notice(error.message)
        console.error('Failed to generate response', error)
      }
    },
  })

  const handleSubmit = (newChatHistory: ChatMessage[]) => {
    submitMutation.mutate({ newChatHistory })
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
        throw new Error(
          'No file is currently open to apply changes. Please open a file and try again.',
        )
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
      if (
        error instanceof LLMAPIKeyNotSetException ||
        error instanceof LLMAPIKeyInvalidException
      ) {
        new OpenSettingsModal(app, error.message, () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const setting = (app as any).setting
          setting.open()
          setting.openTabById('smart-composer')
        }).open()
      } else {
        new Notice(error.message)
        console.error('Failed to apply changes', error)
      }
    },
  })

  const handleApply = useCallback(
    (blockToApply: string, chatMessages: ChatMessage[]) => {
      applyMutation.mutate({ blockToApply, chatMessages })
    },
    [applyMutation],
  )

  useEffect(() => {
    setFocusedMessageId(inputMessage.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const updateConversationAsync = async () => {
      try {
        if (chatMessages.length > 0) {
          createOrUpdateConversation(currentConversationId, chatMessages)
        }
      } catch (error) {
        new Notice('Failed to save chat history')
        console.error('Failed to save chat history', error)
      }
    }
    updateConversationAsync()
  }, [currentConversationId, chatMessages, createOrUpdateConversation])

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
          mentionable,
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
                  mentionable,
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
          mentionables: [...prevInputMessage.mentionables, mentionable],
        }))
      } else {
        setChatMessages((prevChatHistory) =>
          prevChatHistory.map((message) =>
            message.id === focusedMessageId && message.role === 'user'
              ? {
                  ...message,
                  mentionables: [...message.mentionables, mentionable],
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
        <h1 className="smtcmp-chat-header-title">Chat</h1>
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
              key={message.id}
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
            <ReactMarkdownItem
              key={message.id}
              index={index}
              chatMessages={chatMessages}
              handleApply={handleApply}
              isApplying={applyMutation.isPending}
            >
              {message.content}
            </ReactMarkdownItem>
          ),
        )}
        <QueryProgress state={queryProgress} />
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

function ReactMarkdownItem({
  index,
  chatMessages,
  handleApply,
  isApplying,
  children,
}: {
  index: number
  chatMessages: ChatMessage[]
  handleApply: (blockToApply: string, chatMessages: ChatMessage[]) => void
  isApplying: boolean
  children: string
}) {
  const onApply = useCallback(
    (blockToApply: string) => {
      handleApply(blockToApply, chatMessages.slice(0, index + 1))
    },
    [handleApply, chatMessages, index],
  )

  return (
    <ReactMarkdown onApply={onApply} isApplying={isApplying}>
      {children}
    </ReactMarkdown>
  )
}

Chat.displayName = 'Chat'

export default Chat
