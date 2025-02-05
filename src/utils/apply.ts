import { TFile } from 'obsidian'

import { editorStateToPlainText } from '../components/chat-view/chat-input/utils/editor-state-to-plain-text'
import { BaseLLMProvider } from '../core/llm/base'
import { ChatMessage, ChatUserMessage } from '../types/chat'
import { ChatModel } from '../types/chat-model.types'
import { RequestMessage } from '../types/llm/request'
import { MentionableBlock, MentionableFile } from '../types/mentionable'
import { LLMProvider } from '../types/provider.types'

const systemPrompt = `You are an intelligent assistant helping a user apply changes to a markdown file.

You will receive:
1. The content of the target markdown file.
2. A conversation history between the user and the assistant. This conversation may contain multiple markdown blocks suggesting changes to the file. Markdown blocks are indicated by the <smtcmp_block> tag. For example:
<smtcmp_block>
<!-- ... existing content ... -->
{{ edit_1 }}
<!-- ... existing content ... -->
{{ edit_2 }}
<!-- ... existing content ... -->
</smtcmp_block>
3. A single, specific markdown block extracted from the conversation history. This block contains the exact changes that should be applied to the target file.

Please rewrite the entire markdown file with ONLY the changes from the specified markdown block applied. DO NOT apply changes suggested by other parts of the conversation. Preserve all parts of the original file that are not related to the changes. Output only the file content, without any additional words or explanations.`

const parseUserMessageForApply = (message: ChatUserMessage): string => {
  // Exclude file contents for apply prompts
  const files = message.mentionables
    .filter((m): m is MentionableFile => m.type === 'file')
    .map((m) => m.file)
  const filePrompt = files
    .map((file) => {
      return `\`\`\`${file.path}\n${'<!-- ... existing content ... -->'}\n\`\`\`\n`
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

const generateApplyPrompt = (
  blockToApply: string,
  currentFile: TFile,
  currentFileContent: string,
  chatMessages: ChatMessage[],
) => {
  return `# Inputs

## Target File
Here is the file to apply changes to.
\`\`\`${currentFile.path}
${currentFileContent}
\`\`\`

## Conversation History
${chatMessages
  .map((message) => {
    if (message.role === 'user') {
      return `[User]: ${parseUserMessageForApply(message)}`
    } else {
      return `[Assistant]: ${message.content}`
    }
  })
  .join('\n')}

## Changes to Apply
Here is the markdown block that indicates where content changes should be applied.
<smtcmp_block>
${blockToApply}
</smtcmp_block>

Now rewrite the entire file with the changes applied. Immediately start your response with \`\`\`${currentFile.path}`
}

export const applyChangesToFile = async ({
  blockToApply,
  currentFile,
  currentFileContent,
  chatMessages,
  providerClient,
  model,
}: {
  blockToApply: string
  currentFile: TFile
  currentFileContent: string
  chatMessages: ChatMessage[]
  providerClient: BaseLLMProvider<LLMProvider>
  model: ChatModel
}): Promise<string | null> => {
  const requestMessages: RequestMessage[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: generateApplyPrompt(
        blockToApply,
        currentFile,
        currentFileContent,
        chatMessages,
      ),
    },
  ]

  const response = await providerClient.generateResponse(model, {
    model: model.model,
    messages: requestMessages,
    stream: false,

    // prediction is only available for OpenAI
    prediction: {
      type: 'content',
      content: [
        {
          type: 'text',
          text: currentFileContent,
        },
        {
          type: 'text',
          text: blockToApply,
        },
      ],
    },
  })

  const responseContent = response.choices[0].message.content
  return responseContent ? extractApplyResponseContent(responseContent) : null
}

const extractApplyResponseContent = (response: string) => {
  const lines = response.split('\n')
  if (lines[0].startsWith('```')) {
    lines.shift()
  }
  if (lines[lines.length - 1].startsWith('```')) {
    lines.pop()
  }
  return lines.join('\n')
}
