import {
  AssistantToolMessageGroup,
  ChatMessage,
  ChatUserMessage,
} from '../../types/chat'

export function groupAssistantAndToolMessages(
  messages: ChatMessage[],
): (ChatUserMessage | AssistantToolMessageGroup)[] {
  return messages.reduce(
    (
      acc: (ChatUserMessage | AssistantToolMessageGroup)[],
      message,
    ): (ChatUserMessage | AssistantToolMessageGroup)[] => {
      if (message.role === 'user') {
        // Always push user messages directly
        acc.push(message)
      } else {
        // For assistant or tool messages, check if we can add to an existing group
        const lastItem = acc[acc.length - 1]

        // If last item is an array (a group), and current message is an assistant or tool message, add to group
        if (
          Array.isArray(lastItem) &&
          (message.role === 'assistant' || message.role === 'tool')
        ) {
          lastItem.push(message)
        } else {
          // Otherwise, create a new group
          acc.push([message])
        }
      }
      return acc
    },
    [],
  )
}
