import { App, TFile } from 'obsidian'
import { v4 as uuidv4 } from 'uuid'

import { getChatModelClient } from '../../core/llm/manager'
import { McpManager } from '../../core/mcp/mcpManager'
import { RAGEngine } from '../../core/rag/ragEngine'
import { ChatManager } from '../../database/json/chat/ChatManager'
import { serializeChatMessage } from '../../hooks/useChatHistory'
import { SmartComposerSettings } from '../../settings/schema/setting.types'
import { ChatMessage, ChatUserMessage } from '../../types/chat'
import { MentionableBlockData } from '../../types/mentionable'
import { plainTextToEditorState } from '../../utils/chat/plain-text-to-editor-state'
import { PromptGenerator } from '../../utils/chat/promptGenerator'
import { ResponseGenerator } from '../../utils/chat/responseGenerator'

export type CreateChatOptions = {
  blocks?: MentionableBlockData[]
  file?: TFile | null
}

export class ChatService {
  private readonly app: App
  private readonly settings: SmartComposerSettings
  private readonly chatManager: ChatManager
  private readonly getRAGEngine: () => Promise<RAGEngine>
  private readonly getMcpManager: () => Promise<McpManager>

  /** Track when each conversation's initial streaming finishes. */
  private readonly streamDoneMap = new Map<string, Promise<void>>()

  constructor(params: {
    app: App
    settings: SmartComposerSettings
    chatManager: ChatManager
    getRAGEngine: () => Promise<RAGEngine>
    getMcpManager: () => Promise<McpManager>
  }) {
    this.app = params.app
    this.settings = params.settings
    this.chatManager = params.chatManager
    this.getRAGEngine = params.getRAGEngine
    this.getMcpManager = params.getMcpManager
  }

  /**
   * Create a chat in the background, submit the first user message, and start
   * streaming a response. Returns the new conversation id immediately.
   */
  public async createChat(
    initialText: string,
    opts: CreateChatOptions = {},
  ): Promise<string> {
    const { blocks = [], file = this.app.workspace.getActiveFile() } = opts

    // 1. Build first user message
    const firstMessage: ChatUserMessage = {
      role: 'user',
      content: plainTextToEditorState(initialText),
      promptContent: null,
      id: uuidv4(),
      mentionables: [
        { type: 'current-file', file },
        ...blocks.map((b) => ({ type: 'block' as const, ...b })),
      ],
    }

    // 2. Build PromptGenerator
    const promptGenerator = new PromptGenerator(
      this.getRAGEngine,
      this.app,
      this.settings,
    )

    type CompilePromptResult = Awaited<
      ReturnType<PromptGenerator['compileUserMessagePrompt']>
    >

    let compiled: CompilePromptResult
    try {
      compiled = await promptGenerator.compileUserMessagePrompt({
        message: firstMessage,
        useVaultSearch: false, // avoid RAG unless user explicitly adds vault mentionable
      })
    } catch (error) {
      // If RAG/embeddings fail due to missing API key, fall back to plain text prompt
      const {
        LLMAPIKeyNotSetException,
        LLMAPIKeyInvalidException,
        LLMBaseUrlNotSetException,
      } = await import('../../core/llm/exception')

      if (
        error instanceof LLMAPIKeyNotSetException ||
        error instanceof LLMAPIKeyInvalidException ||
        error instanceof LLMBaseUrlNotSetException
      ) {
        console.warn('Embeddings unavailable. Falling back to simple prompt.')
        compiled = {
          promptContent: [
            {
              type: 'text' as const,
              text: `${firstMessage.content ? initialText : ''}`,
            },
          ],
          shouldUseRAG: false,
        } as CompilePromptResult
      } else {
        throw error
      }
    }

    const compiledMessages: ChatMessage[] = [
      {
        ...firstMessage,
        promptContent: compiled.promptContent,
        similaritySearchResults: compiled.similaritySearchResults,
      },
    ]

    // 3. Create chat on disk
    const title = initialText.trim().substring(0, 50) || 'New chat'
    const chat = await this.chatManager.createChat({
      title,
      messages: compiledMessages.map(serializeChatMessage),
    })

    // 4. Kick off streaming in background (fire-and-forget)
    const donePromise = this.startStreamingResponse({
      conversationId: chat.id,
      initialMessages: compiledMessages,
      promptGenerator,
    })

    this.streamDoneMap.set(chat.id, donePromise)

    return chat.id
  }

  /**
   * Returns a promise that resolves when the assistant response for the
   * given conversation finishes streaming. If no stream is running it
   * resolves immediately.
   */
  public waitUntilFinished(conversationId: string): Promise<void> {
    return this.streamDoneMap.get(conversationId) ?? Promise.resolve()
  }

  private async startStreamingResponse({
    conversationId,
    initialMessages,
    promptGenerator,
  }: {
    conversationId: string
    initialMessages: ChatMessage[]
    promptGenerator: PromptGenerator
  }) {
    try {
      const { providerClient, model } = getChatModelClient({
        settings: this.settings,
        modelId: this.settings.chatModelId,
      })

      const mcpManager = await this.getMcpManager()

      const responseGenerator = new ResponseGenerator({
        providerClient,
        model,
        messages: initialMessages,
        conversationId,
        enableTools: this.settings.chatOptions.enableTools,
        maxAutoIterations: this.settings.chatOptions.maxAutoIterations,
        promptGenerator,
        mcpManager,
      })

      let latestMessages: ChatMessage[] = [...initialMessages]

      responseGenerator.subscribe(async (messages) => {
        latestMessages = [...initialMessages, ...messages]
        // Persist each update so UI sees progress
        try {
          await this.chatManager.updateChat(conversationId, {
            messages: latestMessages.map(serializeChatMessage),
          })
        } catch (err) {
          const typedErr = err as { code?: string } | undefined
          // Rapid successive writes can make the previous file already
          // gone when the internal delete runs; ignore that benign case.
          if (typedErr?.code !== 'ENOENT') {
            throw err
          }
        }
      })

      // Run without awaiting – but ensure we handle errors
      return responseGenerator.run().catch((err) => {
        console.error('ChatService stream error', err)
      })
    } catch (error) {
      console.error('Failed to stream chat response', error)
      return
    }
  }
}
