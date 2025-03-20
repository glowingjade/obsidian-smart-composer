import { ContentPart, RequestMessage } from '../../types/llm/request'

/**
 * Concatenates message contents, handling both string and ContentPart[] formats.
 * Returns either a string or ContentPart[] depending on the message role.
 */
function concatenateMessageContent(
  prevContent: string | ContentPart[],
  currentContent: string | ContentPart[],
): string | ContentPart[] {
  const prevParts: ContentPart[] =
    typeof prevContent === 'string'
      ? [{ type: 'text', text: prevContent }]
      : prevContent
  const currParts: ContentPart[] =
    typeof currentContent === 'string'
      ? [{ type: 'text', text: currentContent }]
      : currentContent

  const merged = [...prevParts, ...currParts].filter(
    (part) => !(part.type === 'text' && part.text.trim().length === 0),
  )
  if (merged.every((part) => part.type === 'text')) {
    return merged.map((part) => part.text).join('\n\n')
  }
  return merged
}

/**
 * Formats the messages to ensure proper alternation between user and
 * assistant messages. It merges consecutive messages of the same role.
 * If a merge involves ContentPart[] and/or string representations,
 * both are first normalized into arrays, then merged so that all text parts are combined.
 *
 * This function helps maintain proper message structure for LLM APIs that require
 * alternating user and assistant messages. Consecutive messages of the same role
 * are merged to ensure compatibility with various LLM providers.
 *
 * All system messages are collected, concatenated, and placed at the beginning.
 */
export function formatMessages(messages: RequestMessage[]): RequestMessage[] {
  const formattedMessages: RequestMessage[] = []

  const systemMessages = messages.filter((msg) => msg.role === 'system')
  const nonSystemMessages = messages.filter((msg) => msg.role !== 'system')

  // Collect all system messages and concatenate them
  if (systemMessages.length > 0) {
    const combinedSystemContent = systemMessages
      .map((msg) => (typeof msg.content === 'string' ? msg.content : ''))
      .filter((content) => content.trim().length > 0)
      .join('\n\n')

    if (combinedSystemContent.trim().length > 0) {
      formattedMessages.push({
        role: 'system',
        content: combinedSystemContent,
      })
    }
  }

  // Merge consecutive messages of the same role
  for (const currentMessage of nonSystemMessages) {
    const prevMessage = formattedMessages[formattedMessages.length - 1]

    if (prevMessage && prevMessage.role === currentMessage.role) {
      prevMessage.content = concatenateMessageContent(
        prevMessage.content,
        currentMessage.content,
      )
    } else {
      formattedMessages.push(currentMessage)
    }
  }

  return formattedMessages
}
