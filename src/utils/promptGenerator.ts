import { App, TFile } from 'obsidian'

import { editorStateToPlainText } from '../components/chat-view/chat-input/utils/editor-state-to-plain-text'
import { ChatMessage, ChatUserMessage } from '../types/chat'
import { RequestMessage } from '../types/llm/request'
import {
  MentionableBlock,
  MentionableFile,
  MentionableFolder,
  MentionableVault,
} from '../types/mentionable'
import { SmartCopilotSettings } from '../types/settings'

import {
  getNestedFiles,
  readMultipleTFiles,
  readTFileContent,
} from './obsidian'
import { RAGEngine } from './ragEngine'
import { tokenCount } from './token'

export class PromptGenerator {
  private ragEngine: RAGEngine
  private app: App
  private settings: SmartCopilotSettings

  constructor(ragEngine: RAGEngine, app: App, settings: SmartCopilotSettings) {
    this.ragEngine = ragEngine
    this.app = app
    this.settings = settings
  }

  public async generateRequestMessages(messages: ChatMessage[]): Promise<{
    requestMessages: RequestMessage[]
    parsedMessages: ChatMessage[]
  }> {
    if (messages.length === 0) {
      throw new Error('No messages provided')
    }
    const lastUserMessage = messages[messages.length - 1]
    if (lastUserMessage.role !== 'user') {
      throw new Error('Last message is not a user message')
    }

    const { parsedContent, shouldUseRAG } =
      await this.parseUserMessage(lastUserMessage)
    let parsedMessages = [
      ...messages.slice(0, -1),
      {
        ...lastUserMessage,
        parsedContent: parsedContent,
      },
    ]

    // Safeguard: ensure all user messages have parsed content
    parsedMessages = await Promise.all(
      parsedMessages.map(async (message) => {
        if (message.role === 'user' && !message.parsedContent) {
          const { parsedContent } = await this.parseUserMessage(message)
          return {
            ...message,
            parsedContent: parsedContent,
          }
        }
        return message
      }),
    )

    const systemMessage = this.getSystemMessage(shouldUseRAG)

    const currentFile = lastUserMessage.mentionables.find(
      (m) => m.type === 'current-file',
    )?.file
    const currentFileMessage = currentFile
      ? await this.getCurrentFileMessage(currentFile)
      : undefined

    const requestMessages: RequestMessage[] = [
      systemMessage,
      ...(currentFileMessage ? [currentFileMessage] : []),
      ...parsedMessages.map((message): RequestMessage => {
        if (message.role === 'user') {
          return {
            role: 'user',
            content: message.parsedContent ?? '',
          }
        } else {
          return {
            role: 'assistant',
            content: message.content,
          }
        }
      }),
      ...(shouldUseRAG ? [this.getRagInstructionMessage()] : []),
    ]

    return {
      requestMessages,
      parsedMessages,
    }
  }

  private async parseUserMessage(message: ChatUserMessage): Promise<{
    parsedContent: string
    shouldUseRAG: boolean
  }> {
    if (!this.ragEngine) {
      throw new Error('RAG engine not initialized')
    }
    if (!message.content) {
      return {
        parsedContent: '',
        shouldUseRAG: false,
      }
    }
    const query = editorStateToPlainText(message.content)

    const useVaultWideContext = message.mentionables.some(
      (m): m is MentionableVault => m.type === 'vault',
    )

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

    // Count tokens incrementally to avoid long processing times on large content sets
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
    const shouldUseRAG = useVaultWideContext || (await exceedsTokenThreshold())

    let filePrompt: string
    if (shouldUseRAG) {
      const results = useVaultWideContext
        ? await this.ragEngine.processQuery(query) // TODO: Add similarity boosting for mentioned files or folders
        : await this.ragEngine.processQuery(query, {
            files: files.map((f) => f.path),
            folders: folders.map((f) => f.path),
          })
      filePrompt = `## Potentially Relevant Snippets from the current vault
${results
  .map(({ path, content, metadata }) => {
    const contentWithLineNumbers = this.addLineNumbersToContent({
      content,
      startLine: metadata.startLine,
    })
    return `\`\`\`${path}\n${contentWithLineNumbers}\n\`\`\`\n`
  })
  .join('')}\n`
    } else {
      filePrompt = allFiles
        .map((file, index) => {
          return `\`\`\`${file.path}\n${fileContents[index]}\n\`\`\`\n`
        })
        .join('')
    }

    const blocks = message.mentionables.filter(
      (m): m is MentionableBlock => m.type === 'block',
    )
    const blockPrompt = blocks
      .map(({ file, content }) => {
        return `\`\`\`${file.path}\n${content}\n\`\`\`\n`
      })
      .join('')

    return {
      parsedContent: `${filePrompt}${blockPrompt}\n\n${query}\n\n`,
      shouldUseRAG,
    }
  }

  private getSystemMessage(shouldUseRAG: boolean): RequestMessage {
    const systemPrompt = `You are an intelligent assistant to help answer any questions that the user has, particularly about editing and organizing markdown files in Obsidian.

1. Please keep your response as concise as possible. Avoid being verbose.

2. When the user is asking for edits to their markdown, please provide a simplified version of the markdown block emphasizing only the changes. Use comments to show where unchanged content has been skipped. Wrap the markdown block with <smtcmp_block> tags. Add filename and language attributes to the <smtcmp_block> tags. For example:
<smtcmp_block filename="path/to/file.md" language="markdown">
<!-- ... existing content ... -->
{{ edit_1 }}
<!-- ... existing content ... -->
{{ edit_2 }}
<!-- ... existing content ... -->
</smtcmp_block>
The user has full access to the file, so they prefer seeing only the changes in the markdown. Often this will mean that the start/end of the file will be skipped, but that's okay! Rewrite the entire file only if specifically requested. Always provide a brief explanation of the updates, except when the user specifically asks for just the content.

3. Do not lie or make up facts.

4. Respond in the same language as the user's message.

5. Format your response in markdown.

6. When writing out new markdown blocks, also wrap them with <smtcmp_block> tags. For example:
<smtcmp_block language="markdown">
{{ content }}
</smtcmp_block>

7. When providing markdown blocks for an existing file, add the filename and language attributes to the <smtcmp_block> tags. Restate the relevant section or heading, so the user knows which part of the file you are editing. For example:
<smtcmp_block filename="path/to/file.md" language="markdown">
## Section Title
...
{{ content }}
...
</smtcmp_block>`

    const systemPromptRAG = `You are an intelligent assistant to help answer any questions that the user has, particularly about editing and organizing markdown files in Obsidian. You will be given your conversation history with them and potentially relevant blocks of markdown content from the current vault.
      
1. Do not lie or make up facts.

2. Respond in the same language as the user's message.

3. Format your response in markdown.

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

  d. When referencing a markdown block the user gives you, only add the startLine and endLine attributes to the <smtcmp_block> tags. Write related content outside of the <smtcmp_block> tags. The content inside the <smtcmp_block> tags will be ignored and replaced with the actual content of the markdown block. For example:
  <smtcmp_block filename="path/to/file.md" language="markdown" startLine="2" endLine="30"></smtcmp_block>`

    return {
      role: 'system',
      content: shouldUseRAG ? systemPromptRAG : systemPrompt,
    }
  }

  private async getCurrentFileMessage(
    currentFile: TFile,
  ): Promise<RequestMessage> {
    const fileContent = await readTFileContent(currentFile, this.app.vault)
    return {
      role: 'user',
      content: `# Inputs
## Current File
Here is the file I'm looking at.
\`\`\`${currentFile.path}
${fileContent}
\`\`\`\n\n`,
    }
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
}
