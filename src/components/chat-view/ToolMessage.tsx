import { useCallback } from 'react'

import { useMcp } from '../../contexts/mcp-context'
import { useSettings } from '../../contexts/settings-context'
import {
  ChatToolMessage,
  ToolCallRequest,
  ToolCallResponse,
  ToolCallResponseStatus,
} from '../../types/chat'
import { parseToolName } from '../../utils/mcp/tool-name-utils'

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
  const { settings, setSettings } = useSettings()
  const { getMcpManager } = useMcp()

  const handleToolCall = useCallback(async () => {
    const mcpManager = await getMcpManager()
    onResponseUpdate({
      status: ToolCallResponseStatus.PendingExecution,
    })
    const toolCallResponse = await mcpManager.callTool({
      name: request.name,
      args: request.arguments,
      id: request.id,
    })
    onResponseUpdate(toolCallResponse)
  }, [request, onResponseUpdate, getMcpManager])

  const handleAllowAutoExecution = useCallback(async () => {
    const { serverName, toolName } = parseToolName(request.name)
    const server = settings.mcp.servers.find((s) => s.id === serverName)
    if (!server) {
      return
    }
    const toolOptions = server.toolOptions
    if (!toolOptions[toolName]) {
      // If the tool is not in the toolOptions, add it with default values
      toolOptions[toolName] = {
        allowAutoExecution: false,
        disabled: false,
      }
    }
    toolOptions[toolName].allowAutoExecution = true

    setSettings({
      ...settings,
      mcp: {
        ...settings.mcp,
        servers: settings.mcp.servers.map((s) =>
          s.id === server.id
            ? {
                ...s,
                toolOptions: toolOptions,
              }
            : s,
        ),
      },
    })
  }, [request, settings, setSettings])

  const handleReject = useCallback(async () => {
    onResponseUpdate({
      status: ToolCallResponseStatus.Rejected,
    })
  }, [onResponseUpdate])

  const handleAbort = useCallback(async () => {
    const mcpManager = await getMcpManager()
    mcpManager.abortToolCall(request.id)
    onResponseUpdate({
      status: ToolCallResponseStatus.Aborted,
    })
  }, [request, onResponseUpdate, getMcpManager])

  return (
    <pre style={{ border: '1px solid var(--background-modifier-border)' }}>
      <div>{request.name}</div>
      <div>{request.arguments}</div>
      <ToolCallStatusResponse
        response={response}
        onAllow={handleToolCall}
        onAllowAutoExecution={() => {
          handleAllowAutoExecution()
          handleToolCall()
        }}
        onReject={handleReject}
        onAbort={handleAbort}
      />
    </pre>
  )
}

function ToolCallStatusResponse({
  response,
  onAllow,
  onAllowAutoExecution,
  onReject,
  onAbort,
}: {
  response: ToolCallResponse
  onAllow: () => void
  onAllowAutoExecution: () => void
  onReject: () => void
  onAbort: () => void
}) {
  switch (response.status) {
    case ToolCallResponseStatus.PendingExecution:
      return (
        <div>
          <div>Pending execution</div>
          <button onClick={onAbort}>Abort</button>
        </div>
      )
    case ToolCallResponseStatus.PendingApproval:
      return (
        <div>
          <div>Pending approval</div>
          <button onClick={onAllow}>Allow</button>
          <button onClick={onAllowAutoExecution}>Always allow</button>
          <button onClick={onReject}>Reject</button>
        </div>
      )
    case ToolCallResponseStatus.Success:
      return (
        <div>
          <div>Success</div>
          <div>{response.data.text.slice(0, 100)}</div>
        </div>
      )
    case ToolCallResponseStatus.Error:
      return (
        <div>
          <div>Error</div>
          <div>{response.error}</div>
        </div>
      )
    case ToolCallResponseStatus.Aborted:
      return (
        <div>
          <div>Aborted</div>
        </div>
      )
  }
}
