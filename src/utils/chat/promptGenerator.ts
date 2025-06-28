// src/utils/chat/promptGenerator.ts

import { App, TFile, htmlToMarkdown, requestUrl } from 'obsidian'

import { editorStateToPlainText } from '../../components/chat-view/chat-input/utils/editor-state-to-plain-text'
import { QueryProgressState } from '../../components/chat-view/QueryProgress'
import { RAGEngine } from '../../core/rag/ragEngine'
import { SelectEmbedding } from '../../database/schema'
import { SmartComposerSettings } from '../../settings/schema/setting.types'
import {
  ChatAssistantMessage,
  ChatMessage,
  ChatToolMessage,
  ChatUserMessage,
} from '../../types/chat'
import { ContentPart, RequestMessage } from '../../types/llm/request'
import {
  MentionableBlock,
  MentionableFile,
  MentionableFolder,
  MentionableImage,
  MentionableUrl,
  MentionableVault,
} from '../../types/mentionable'
import { PromptLevel } from '../../types/prompt-level.types'
import { ToolCallResponseStatus } from '../../types/tool-call.types'
import { tokenCount } from '../llm/token'
import {
  getNestedFiles,
  readMultipleTFiles,
  readTFileContent,
} from '../obsidian'

import { YoutubeTranscript, isYoutubeUrl } from './youtube-transcript'
import { fetchLinkedNotes } from './linkFetcher'

export class PromptGenerator {
  private getRagEngine: () => Promise<RAGEngine>
  private app: App
  private settings: SmartComposerSettings
  private MAX_CONTEXT_MESSAGES = 20

  constructor(
    getRagEngine: () => Promise<RAGEngine>,
    app: App,
    settings: SmartComposerSettings,
  ) {
    this.getRagEngine = getRagEngine
    this.app = app
    this.settings = settings
  }

  public async generateRequestMessages({
    messages,
  }: {
    messages: ChatMessage[]
  }): Promise<RequestMessage[]> {
    if (messages.length === 0) {
      throw new Error('No messages provided')
    }

    const compiledMessages = await Promise.all(
      messages.map(async (message) => {
        if (message.role === 'user' && !message.promptContent) {
          const { promptContent, similaritySearchResults } =
            await this.compileUserMessagePrompt({
              message,
            })
          return {
            ...message,
            promptContent,
            similaritySearchResults,
          }
        }
        return message
      }),
    )

    let lastUserMessage: ChatUserMessage | undefined = undefined
    for (let i = compiledMessages.length - 1; i >= 0; --i) {
      if (compiledMessages[i].role === 'user') {
        lastUserMessage = compiledMessages[i] as ChatUserMessage
        break
      }
    }
    if (!lastUserMessage) {
      throw new Error('No user messages found')
    }
    const shouldUseRAG = lastUserMessage.similaritySearchResults !== undefined

    const systemMessage = this.getSystemMessage(shouldUseRAG)

    const customInstructionMessage = this.getCustomInstructionMessage()

    const currentFileMessage = await this.getCurrentFileMessage(lastUserMessage)

    const requestMessages: RequestMessage[] = [
      systemMessage,
      ...(customInstructionMessage ? [customInstructionMessage] : []),
      ...(currentFileMessage ? [currentFileMessage] : []),
      ...this.getChatHistoryMessages({ messages: compiledMessages }),
      ...(shouldUseRAG && this.getModelPromptLevel() == PromptLevel.Default
        ? [this.getRagInstructionMessage()]
        : []),
    ]

    return requestMessages
  }

  private getChatHistoryMessages({
    messages,
  }: {
    messages: ChatMessage[]
  }): RequestMessage[] {
    const requestMessages: RequestMessage[] = messages
      .slice(-this.MAX_CONTEXT_MESSAGES)
      .flatMap((message): RequestMessage[] => {
        if (message.role === 'user') {
          return [
            {
              role: 'user',
              content: message.promptContent ?? '',
            },
          ]
        } else if (message.role === 'assistant') {
          return this.parseAssistantMessage({ message })
        } else {
          return this.parseToolMessage({ message })
        }
      })

    const filteredRequestMessages: RequestMessage[] = requestMessages
      .map((msg) => {
        switch (msg.role) {
          case 'user':
            return msg
          case 'assistant': {
            const filteredToolCalls = msg.tool_calls?.filter((t) =>
              requestMessages.some(
                (rm) => rm.role === 'tool' && rm.tool_call.id === t.id,
              ),
            )
            return {
              ...msg,
              tool_calls:
                filteredToolCalls && filteredToolCalls.length > 0
                  ? filteredToolCalls
                  : undefined,
            }
          }
          case 'tool': {
            const assistantMessage = requestMessages.find(
              (rm) =>
                rm.role === 'assistant' &&
                rm.tool_calls?.some((t) => t.id === msg.tool_call.id),
            )
            if (!assistantMessage) {
              return null
            } else {
              return msg
            }
          }
          default:
            return msg
        }
      })
      .filter((m) => m !== null)

    return filteredRequestMessages
  }

  private parseAssistantMessage({
    message,
  }: {
    message: ChatAssistantMessage
  }): RequestMessage[] {
    let citationContent: string | null = null
    if (message.annotations && message.annotations.length > 0) {
      citationContent = `Citations:
${message.annotations
  .map((annotation, index) => {
    if (annotation.type === 'url_citation') {
      const { url, title } = annotation.url_citation
      return `[${index + 1}] ${title ? `${title}: ` : ''}${url}`
    }
  })
  .join('\n')}`
    }

    return [
      {
        role: 'assistant',
        content: [
          message.content,
          ...(citationContent ? [citationContent] : []),
        ].join('\n'),
        tool_calls: message.toolCallRequests,
      },
    ]
  }

  private parseToolMessage({
    message,
  }: {
    message: ChatToolMessage
  }): RequestMessage[] {
    return message.toolCalls.map((toolCall) => {
      switch (toolCall.response.status) {
        case ToolCallResponseStatus.PendingApproval:
        case ToolCallResponseStatus.Running:
        case ToolCallResponseStatus.Rejected:
        case ToolCallResponseStatus.Aborted:
          return {
            role: 'tool',
            tool_call: toolCall.request,
            content: `Tool call ${toolCall.request.id} is ${toolCall.response.status}`,
          }
        case ToolCallResponseStatus.Success:
          return {
            role: 'tool',
            tool_call: toolCall.request,
            content: toolCall.response.data.text,
          }
        case ToolCallResponseStatus.Error:
          return {
            role: 'tool',
            tool_call: toolCall.request,
            content: `Error: ${toolCall.response.error}`,
          }
      }
    })
  }

  public async compileUserMessagePrompt({
    message,
    useVaultSearch,
    additionalContent,
    onQueryProgressChange,
  }: {
    message: ChatUserMessage
    useVaultSearch?: boolean
    additionalContent?: string[]
    onQueryProgressChange?: (queryProgress: QueryProgressState) => void
  }): Promise<{
    promptContent: ChatUserMessage['promptContent']
    shouldUseRAG: boolean
    similaritySearchResults?: (Omit<SelectEmbedding, 'embedding'> & {
      similarity: number
    })[]
  }> {
    try {
      if (!message.content) {
        return {
          promptContent: '',
          shouldUseRAG: false,
        }
      }
      const query = editorStateToPlainText(message.content)
      let similaritySearchResults = undefined

      useVaultSearch =
        useVaultSearch ||
        message.mentionables.some(
          (m): m is MentionableVault => m.type === 'vault',
        )

      onQueryProgressChange?.({
        type: 'reading-mentionables',
      })
      const files = message.mentionables
        .filter((m): m is MentionableFile => m.type === 'file')
        .map((m) => m.file)
      const folders = message.mentionables
        .filter((m): m is MentionableFolder => m.type === 'folder')
        .map((m) => m.folder)
      const nestedFiles = folders.flatMap((folder) =>
        getNestedFiles(folder, this.app.vault),
      )
      const allFiles = [...files, ...nestedFiles]
      const fileContents = await readMultipleTFiles(allFiles, this.app.vault)

      const exceedsTokenThreshold = async () => {
        let accTokenCount = 0
        for (const content of fileContents) {
          const count = await tokenCount(content)
          accTokenCount += count
          if (accTokenCount > this.settings.ragOptions.thresholdTokens) {
            return true
          }
        }
        return false
      }
      const shouldUseRAG = useVaultSearch || (await exceedsTokenThreshold())

      let filePrompt: string
      if (shouldUseRAG) {
        similaritySearchResults = useVaultSearch
          ? await (
              await this.getRagEngine()
            ).processQuery({
              query,
              onQueryProgressChange: onQueryProgressChange,
            }) 
          : await (
              await this.getRagEngine()
            ).processQuery({
              query,
              scope: {
                files: files.map((f) => f.path),
                folders: folders.map((f) => f.path),
              },
              onQueryProgressChange: onQueryProgressChange,
            })
        filePrompt = `## Potentially Relevant Snippets from the current vault
${similaritySearchResults
  .map(({ path, content, metadata }) => {
    const newContent =
      this.getModelPromptLevel() == PromptLevel.Default
        ? this.addLineNumbersToContent({
            content,
            startLine: metadata.startLine,
          })
        : content
    return `\`\`\`${path}\n${newContent}\n\`\`\`\n`
  })
  .join('')}\n`
      } else {
        filePrompt = allFiles
          .map((file, index) => {
            return `\`\`\`${file.path}\n${fileContents[index]}\n\`\`\`\n`
          })
          .join('')
      }
      
      let linkedNotesPrompt = '';
      if (additionalContent && additionalContent.length > 0) {
          linkedNotesPrompt = `## Linked Notes Content\n${additionalContent.map(content => `\`\`\`\n${content}\n\`\`\``).join('\n')}\n`;
      }

      const blocks = message.mentionables.filter(
        (m): m is MentionableBlock => m.type === 'block',
      )
      const blockPrompt = blocks
        .map(({ file, content }) => {
          return `\`\`\`${file.path}\n${content}\n\`\`\`\n`
        })
        .join('')

      const urls = message.mentionables.filter(
        (m): m is MentionableUrl => m.type === 'url',
      )

      const urlPrompt =
        urls.length > 0
          ? `## Potentially Relevant Websearch Results
${(
  await Promise.all(
    urls.map(
      async ({ url }) => `\`\`\`
Website URL: ${url}
Website Content:
${await this.getWebsiteContent(url)}
\`\`\``,
    ),
  )
).join('\n')}
`
          : ''

      const imageDataUrls = message.mentionables
        .filter((m): m is MentionableImage => m.type === 'image')
        .map(({ data }) => data)

      onQueryProgressChange?.({
        type: 'idle',
      })

      return {
        promptContent: [
          ...imageDataUrls.map(
            (data): ContentPart => ({
              type: 'image_url',
              image_url: {
                url: data,
              },
            }),
          ),
          {
            type: 'text',
            text: `${linkedNotesPrompt}${filePrompt}${blockPrompt}${urlPrompt}\n\n${query}\n\n`,
          },
        ],
        shouldUseRAG,
        similaritySearchResults: similaritySearchResults,
      }
    } catch (error) {
      console.error('Failed to compile user message', error)
      onQueryProgressChange?.({
        type: 'idle',
      })
      throw error
    }
  }

  private getSystemMessage(shouldUseRAG: boolean): RequestMessage {
    const modelPromptLevel = this.getModelPromptLevel()
    const systemPrompt = `You are an intelligent assistant to help answer any questions that the user has${modelPromptLevel == PromptLevel.Default ? `, particularly about editing and organizing markdown files in Obsidian` : ''}.

1. Please keep your response as concise as possible. Avoid being verbose.

2. Do not lie or make up facts.

3. Format your response in markdown.

${
  modelPromptLevel == PromptLevel.Default
    ? `4. Respond in the same language as the user's message.

5. When writing out new markdown blocks, also wrap them with <smtcmp_block> tags. For example:
<smtcmp_block language="markdown">
{{ content }}
</smtcmp_block>

6. When providing markdown blocks for an existing file, add the filename and language attributes to the <smtcmp_block> tags. Restate the relevant section or heading, so the user knows which part of the file you are editing. For example:
<smtcmp_block filename="path/to/file.md" language="markdown">
## Section Title
...
{{ content }}
...
</smtcmp_block>

7. When the user is asking for edits to their markdown, please provide a simplified version of the markdown block emphasizing only the changes. Use comments to show where unchanged content has been skipped. Wrap the markdown block with <smtcmp_block> tags. Add filename and language attributes to the <smtcmp_block> tags. For example:
<smtcmp_block filename="path/to/file.md" language="markdown">
{{ edit_1 }}
{{ edit_2 }}
</smtcmp_block>
The user has full access to the file, so they prefer seeing only the changes in the markdown. Often this will mean that the start/end of the file will be skipped, but that's okay! Rewrite the entire file only if specifically requested. Always provide a brief explanation of the updates, except when the user specifically asks for just the content.
`
    : ''
}`

    const systemPromptRAG = `You are an intelligent assistant to help answer any questions that the user has${modelPromptLevel == PromptLevel.Default ? `, particularly about editing and organizing markdown files in Obsidian` : ''}. You will be given your conversation history with them and potentially relevant blocks of markdown content from the current vault.
      
1. Do not lie or make up facts.

2. Format your response in markdown.

${
  modelPromptLevel == PromptLevel.Default
    ? `3. Respond in the same language as the user's message.

4. When referencing markdown blocks in your answer, keep the following guidelines in mind:

  a. Never include line numbers in the output markdown.

  b. Wrap the markdown block with <smtcmp_block> tags. Include language attribute. For example:
  <smtcmp_block language="markdown">
  {{ content }}
  </smtcmp_block>

  c. When providing markdown blocks for an existing file, also include the filename attribute to the <smtcmp_block> tags. For example:
  <smtcmp_block filename="path/to/file.md" language="markdown">
  {{ content }}
  </smtcmp_block>

  d. When referencing a markdown block the user gives you, only add the startLine and endLine attributes to the <smtcmp_block> tags without any content inside. For example:
  <smtcmp_block filename="path/to/file.md" language="markdown" startLine="2" endLine="30"></smtcmp_block>`
    : ''
}`

    return {
      role: 'system',
      content: shouldUseRAG ? systemPromptRAG : systemPrompt,
    }
  }

  private getCustomInstructionMessage(): RequestMessage | null {
    const customInstruction = this.settings.systemPrompt.trim()
    if (!customInstruction) {
      return null
    }
    return {
      role: 'user',
      content: `Here are additional instructions to follow in your responses when relevant. There's no need to explicitly acknowledge them:
<custom_instructions>
${customInstruction}
</custom_instructions>`,
    }
  }

  private async getCurrentFileMessage(
    lastUserMessage: ChatUserMessage,
  ): Promise<RequestMessage | null> {
    const currentFileMentionable = lastUserMessage.mentionables.find(
      (m) => m.type === 'current-file',
    );
  
    if (!currentFileMentionable || !currentFileMentionable.file) return null;
  
    const currentFile = currentFileMentionable.file;
    const {
      includeCurrentFileContent,
      activeFileForwardLinkDepth,
      activeFileBackwardLinkDepth,
    } = this.settings.chatOptions;
  
    let fileContent = '';
    if (includeCurrentFileContent) {
      fileContent = await readTFileContent(currentFile, this.app.vault);
    }
  
    let linkedNotesContent = '';
    if (activeFileForwardLinkDepth > 0 || activeFileBackwardLinkDepth > 0) {
      const linkedFilePaths = await fetchLinkedNotes(
        currentFile.path,
        activeFileForwardLinkDepth,
        activeFileBackwardLinkDepth,
        this.app
      );
      const linkedFiles = linkedFilePaths
        .map(p => this.app.vault.getAbstractFileByPath(p))
        .filter((f): f is TFile => f instanceof TFile);
      const contents = await readMultipleTFiles(linkedFiles, this.app.vault);
      linkedNotesContent = `## Linked Notes Content for Active File\n${contents.map(content => `\`\`\`\n${content}\n\`\`\``).join('\n')}\n`;
    }
  
    return {
      role: 'user',
      content: `# Inputs
## Current File
Here is the file I'm looking at.
\`\`\`${currentFile.path}
${fileContent}
\`\`\`
${linkedNotesContent}\n\n`,
    };
  }
  

  private getRagInstructionMessage(): RequestMessage {
    return {
      role: 'user',
      content: `If you need to reference any of the markdown blocks I gave you, add the startLine and endLine attributes to the <smtcmp_block> tags without any content inside. For example:
<smtcmp_block filename="path/to/file.md" language="markdown" startLine="200" endLine="310"></smtcmp_block>

When writing out new markdown blocks, remember not to include "line_number|" at the beginning of each line.`,
    }
  }

  private addLineNumbersToContent({
    content,
    startLine,
  }: {
    content: string
    startLine: number
  }): string {
    const lines = content.split('\n')
    const linesWithNumbers = lines.map((line, index) => {
      return `${startLine + index}|${line}`
    })
    return linesWithNumbers.join('\n')
  }

  private async getWebsiteContent(url: string): Promise<string> {
    if (isYoutubeUrl(url)) {
      try {
        const { title, transcript } =
          await YoutubeTranscript.fetchTranscriptAndMetadata(url)

        return `Title: ${title}
Video Transcript:
${transcript.map((t) => `${t.offset}: ${t.text}`).join('\n')}`
      } catch (error) {
        console.error('Error fetching YouTube transcript', error)
      }
    }

    const response = await requestUrl({ url })
    return htmlToMarkdown(response.text)
  }

  private getModelPromptLevel(): PromptLevel {
    const chatModel = this.settings.chatModels.find(
      (model) => model.id === this.settings.chatModelId,
    )
    return chatModel?.promptLevel ?? PromptLevel.Default
  }
}