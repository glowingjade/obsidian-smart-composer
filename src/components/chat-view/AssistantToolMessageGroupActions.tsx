import * as Tooltip from '@radix-ui/react-tooltip'
import { Check, CopyIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  AssistantToolMessageGroup,
  ChatAssistantMessage,
} from '../../types/chat'
import { ChatModel } from '../../types/chat-model.types'
import { ResponseUsage } from '../../types/llm/response'
import { calculateLLMCost } from '../../utils/llm/price-calculator'

import LLMResponseInfoPopover from './LLMResponseInfoPopover'
import { getToolMessageContent } from './ToolMessage'

function CopyButton({ messages }: { messages: AssistantToolMessageGroup }) {
  const [copied, setCopied] = useState(false)

  const content = useMemo(() => {
    return messages
      .map((message) => {
        switch (message.role) {
          case 'assistant':
            return message.content === '' ? null : message.content
          case 'tool':
            return getToolMessageContent(message)
        }
      })
      .filter(Boolean)
      .join('\n\n')
  }, [messages])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
    }, 1500)
  }

  return (
    <Tooltip.Provider delayDuration={0}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            onClick={copied ? undefined : handleCopy}
            className="clickable-icon"
          >
            {copied ? <Check size={12} /> : <CopyIcon size={12} />}
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="smtcmp-tooltip-content">
            Copy message
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}

function LLMResponseInfoButton({
  messages,
}: {
  messages: AssistantToolMessageGroup
}) {
  const usage = useMemo<ResponseUsage | null>(() => {
    return messages.reduce((acc: ResponseUsage | null, message) => {
      if (message.role === 'assistant' && message.metadata?.usage) {
        if (!acc) {
          return message.metadata.usage
        }
        return {
          prompt_tokens:
            acc.prompt_tokens + message.metadata.usage.prompt_tokens,
          completion_tokens:
            acc.completion_tokens + message.metadata.usage.completion_tokens,
          total_tokens: acc.total_tokens + message.metadata.usage.total_tokens,
        }
      }
      return acc
    }, null)
  }, [messages])

  // TODO: Handle multiple models in the same message group
  const model = useMemo<ChatModel | undefined>(() => {
    const assistantMessageWithModel = messages.find(
      (message): message is ChatAssistantMessage =>
        message.role === 'assistant' && !!message.metadata?.model,
    )
    return assistantMessageWithModel?.metadata?.model
  }, [messages])

  const cost = useMemo<number | null>(() => {
    if (!model || !usage) {
      return null
    }
    return calculateLLMCost({
      model,
      usage,
    })
  }, [model, usage])

  return (
    <Tooltip.Provider delayDuration={0}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div>
            <LLMResponseInfoPopover
              usage={usage}
              estimatedPrice={cost}
              model={model?.model ?? null}
            />
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="smtcmp-tooltip-content">
            View details
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}

export default function AssistantToolMessageGroupActions({
  messages,
}: {
  messages: AssistantToolMessageGroup
}) {
  return (
    <div className="smtcmp-assistant-message-actions">
      <LLMResponseInfoButton messages={messages} />
      <CopyButton messages={messages} />
    </div>
  )
}
