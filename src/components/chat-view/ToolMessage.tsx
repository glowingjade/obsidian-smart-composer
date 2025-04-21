import { useMCP } from '../../contexts/mcp-context'
import {
  ChatToolMessage,
  ToolCallRequest,
  ToolCallResponse,
} from '../../types/chat'

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
      {message.toolCalls.map((toolCall) => (
        <ToolCallStatus
          key={toolCall.request.id}
          request={toolCall.request}
          response={toolCall.response}
          onResponseUpdate={(response) =>
            onMessageUpdate({
              ...message,
              toolCalls: message.toolCalls.map((t) =>
                t.request.id === toolCall.request.id ? { ...t, response } : t,
              ),
            })
          }
        />
      ))}
    </div>
  )
}

function ToolCallStatus({
  request,
  response,
  onResponseUpdate,
}: {
  request: ToolCallRequest
  response: ToolCallResponse
  onResponseUpdate: (response: ToolCallResponse) => void
}) {
  const { getMCPManager } = useMCP()
  const handleAbort = async () => {
    const mcpManager = await getMCPManager()
    mcpManager.abortToolCall(request.id)
    onResponseUpdate({
      status: 'aborted',
    })
  }

  const handleToolCall = async () => {
    const mcpManager = await getMCPManager()
    onResponseUpdate({
      status: 'pending_execution',
    })
    const toolCallResponse = await mcpManager.callTool({
      name: request.name,
      args: request.arguments,
      id: request.id,
    })
    onResponseUpdate(toolCallResponse)
  }

  return (
    <pre style={{ border: '1px solid var(--background-modifier-border)' }}>
      <div>{request.name}</div>
      <div>{request.arguments}</div>
      <ToolCallStatusResponse
        response={response}
        handleAbort={handleAbort}
        handleToolCall={handleToolCall}
      />
    </pre>
  )
}

function ToolCallStatusResponse({
  response,
  handleAbort,
  handleToolCall,
}: {
  response: ToolCallResponse
  handleAbort: () => void
  handleToolCall: () => void
}) {
  switch (response.status) {
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
          <div>{response.data.text.slice(0, 100)}</div>
        </div>
      )
    case 'error':
      return (
        <div>
          <div>Error</div>
          <div>{response.error}</div>
        </div>
      )
    case 'aborted':
      return (
        <div>
          <div>Aborted</div>
        </div>
      )
  }
}
