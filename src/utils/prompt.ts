import { TFile, Vault } from 'obsidian'
import { ChatCompletionMessageParam } from 'openai/resources'

import { editorStateToPlainText } from '../components/chat-input/utils/editor-state-to-plain-text'
import { ChatMessage, ChatUserMessage } from '../types/chat'
import { MentionableBlock, MentionableFile } from '../types/mentionable'

import { readMultipleTFiles, readTFileContent } from './obsidian'

const getCurrentFileMessage = async (
  currentFile: TFile,
  vault: Vault,
): Promise<ChatCompletionMessageParam> => {
  const fileContent = await readTFileContent(currentFile, vault)
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

const parseUserMessage = async (
  message: ChatUserMessage,
  vault: Vault,
): Promise<string> => {
  const files = message.mentionables
    .filter((m): m is MentionableFile => m.type === 'file')
    .map((m) => m.file)
  const fileContents = await readMultipleTFiles(files, vault)
  const filePrompt = files
    .map((file, index) => {
      return `\`\`\`${file.path}\n${fileContents[index]}\n\`\`\`\n`
    })
    .join('')

  const blocks = message.mentionables.filter(
    (m): m is MentionableBlock => m.type === 'block',
  )
  const blocksPrompt = blocks
    .map(({ file, content }) => {
      return `\`\`\`${file.path}\n${content}\n\`\`\`\n`
    })
    .join('')

  return `${filePrompt}${blocksPrompt}\n\n${message.content ? editorStateToPlainText(message.content) : ''}\n\n`
}

export const parseRequestMessages = async (
  messages: ChatMessage[],
  vault: Vault,
): Promise<ChatCompletionMessageParam[]> => {
  if (messages.length === 0) {
    throw new Error('No messages provided')
  }
  const lastUserMessage = messages[messages.length - 1]
  if (lastUserMessage.role !== 'user') {
    throw new Error('Last message is not a user message')
  }

  const systemMessage = {
    role: 'system',
    content: `You are an intelligent assistant to help answer any questions that the user has, particularly about editing and organizing markdown files in Obsidian.

1. Please keep your response as concise as possible. Avoid being verbose.

2. When the user is asking for edits to their markdown, please provide a simplified version of the markdown block emphasizing only the changes. The user has full access to the file, so they prefer seeing only the changes in the markdown. Follow these guidelines:
  - Wrap the markdown block with <smtcmp_block> tags.
  - Add filename and language attributes to the <smtcmp_block> tags. (e.g. <smtcmp_block filename="path/to/file.md" language="markdown">)
  - Use comments to show where unchanged content has been skipped. (e.g., <!-- ... existing content ... -->)
  - When skipping the start of the file, use a <context_before> tag. Inside this tag, include a unique snippet of text (1-2 lines) that appears before the changes. This snippet must not be part of the content that is being changed, even if it means selecting text further away from the changes.
  - When skipping the end of the file, use a <context_after> tag. Inside this tag, include a unique snippet of text (1-2 lines) that appears after the changes. This snippet must not be part of the content that is being changed, even if it means selecting text further away from the changes.
  - Wrap the actual changes with <edit> tags to clearly indicate the modified content.
  - Restate the relevant section or heading to help the user understand which part of the file you are editing.
  - Rewrite the entire file only if specifically requested.
  - Always provide a brief explanation of the updates, except when the user specifically asks for just the content.

Example:
<smtcmp_block filename="path/to/file.md" language="markdown">
<context_before>
This is the section before the changes.
</context_before>
## Section Title
<!-- ... existing content ... -->
<edit>
{{ edit_1 }}
</edit>
<!-- ... existing content ... -->
## Another Section Title
<!-- ... existing content ... -->
<edit>
{{ edit_2 }}
</edit>
<!-- ... existing content ... -->
<context_after>
This is the section after the changes.
</context_after>
</smtcmp_block>

3. Do not lie or make up facts.

4. Respond in the same language as the user's message.

5. Format your response in markdown.

6. When writing out new markdown or code blocks, also wrap them with <smtcmp_block> tags. For example:
<smtcmp_block language="markdown">
{{ content }}
</smtcmp_block>`,
  }

  const currentFile = lastUserMessage.mentionables.find(
    (m) => m.type === 'current-file',
  )?.file

  const currentFileMessage = currentFile
    ? await getCurrentFileMessage(currentFile, vault)
    : undefined

  const parsedMessages = await Promise.all(
    messages.map(async (message) =>
      message.role === 'user'
        ? { role: 'user', content: await parseUserMessage(message, vault) }
        : { role: 'assistant', content: message.content },
    ),
  )

  return [
    systemMessage,
    ...(currentFileMessage ? [currentFileMessage] : []),
    ...parsedMessages,
  ] as ChatCompletionMessageParam[]
}
