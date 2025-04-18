import { useMCP } from '../../contexts/mcp-context'
import { ChatToolMessage } from '../../types/chat'

export default function ToolMessage({
  message,
  onMessageUpdate,
}: {
  message: ChatToolMessage
  onMessageUpdate: (message: ChatToolMessage) => void
}) {
  return (
    <div
      style={{
        border: '1px solid var(--background-modifier-border)',
        padding: 'var(--size-4-1)',
      }}
    >
      <div>{message.request.name}</div>
      <div>{message.request.arguments}</div>
      <ToolMessageResponse
        message={message}
        onMessageUpdate={onMessageUpdate}
      />
    </div>
  )
}

function ToolMessageResponse({
  message,
  onMessageUpdate,
}: {
  message: ChatToolMessage
  onMessageUpdate: (message: ChatToolMessage) => void
}) {
  const { getMCPManager } = useMCP()
  const handleAbort = async () => {
    const mcpManager = await getMCPManager()
    mcpManager.abortToolCall(message.id)
    onMessageUpdate({
      ...message,
      response: {
        status: 'aborted',
      },
    })
  }

  const handleToolCall = async () => {
    const mcpManager = await getMCPManager()
    onMessageUpdate({
      ...message,
      response: {
        status: 'pending_execution',
      },
    })
    const toolCallResponse = await mcpManager.callTool({
      name: message.request.name,
      args: message.request.arguments,
      id: message.id,
    })
    onMessageUpdate({
      ...message,
      response: toolCallResponse,
    })
  }

  switch (message.response.status) {
    case 'pending_execution':
      return (
        <div>
          <div>Pending execution</div>
          <button onClick={handleAbort}>Abort</button>
        </div>
      )
    case 'pending_approval':
      return (
        <div>
          <div>Pending approval</div>
          <button onClick={handleToolCall}>Allow</button>
        </div>
      )
    case 'success':
      return (
        <div>
          <div>Success</div>
          <div>{message.response.data.text.slice(0, 100)}</div>
        </div>
      )
    case 'error':
      return (
        <div>
          <div>Error</div>
          <div>{message.response.error}</div>
          <button onClick={handleToolCall}>Retry</button>
        </div>
      )
    case 'aborted':
      return (
        <div>
          <div>Aborted</div>
          <button onClick={handleToolCall}>Retry</button>
        </div>
      )
  }
}
