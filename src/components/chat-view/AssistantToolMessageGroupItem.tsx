import {
  AssistantToolMessageGroup,
  ChatMessage,
  ChatToolMessage,
} from '../../types/chat'

import AssistantMessageAnnotations from './AssistantMessageAnnotations'
import AssistantMessageContent from './AssistantMessageContent'
import AssistantMessageReasoning from './AssistantMessageReasoning'
import AssistantToolMessageGroupActions from './AssistantToolMessageGroupActions'
import ToolMessage from './ToolMessage'

export type AssistantToolMessageGroupItemProps = {
  messages: AssistantToolMessageGroup
  contextMessages: ChatMessage[]
  isApplying: boolean
  onApply: (blockToApply: string, chatMessages: ChatMessage[]) => void
  onToolMessageUpdate: (message: ChatToolMessage) => void
}

export default function AssistantToolMessageGroupItem({
  messages,
  contextMessages,
  isApplying,
  onApply,
  onToolMessageUpdate,
}: AssistantToolMessageGroupItemProps) {
  return (
    <div className="smtcmp-assistant-tool-message-group">
      {messages.map((message) =>
        message.role === 'assistant' ? (
          message.reasoning || message.annotations || message.content ? (
            <div key={message.id} className="smtcmp-chat-messages-assistant">
              {message.reasoning && (
                <AssistantMessageReasoning reasoning={message.reasoning} />
              )}
              {message.annotations && (
                <AssistantMessageAnnotations
                  annotations={message.annotations}
                />
              )}
              <AssistantMessageContent
                content={message.content}
                contextMessages={contextMessages}
                handleApply={onApply}
                isApplying={isApplying}
              />
            </div>
          ) : null
        ) : (
          <div key={message.id}>
            <ToolMessage
              message={message}
              onMessageUpdate={onToolMessageUpdate}
            />
          </div>
        ),
      )}
      {messages.length > 0 && (
        <AssistantToolMessageGroupActions messages={messages} />
      )}
    </div>
  )
}
