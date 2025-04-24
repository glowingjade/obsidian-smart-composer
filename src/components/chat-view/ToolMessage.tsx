import clsx from 'clsx'
import { Check, ChevronDown, ChevronRight, Loader2, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import { useMcp } from '../../contexts/mcp-context'
import { useSettings } from '../../contexts/settings-context'
import {
  ChatToolMessage,
  ToolCallRequest,
  ToolCallResponse,
  ToolCallResponseStatus,
} from '../../types/chat'
import { parseToolName } from '../../utils/mcp/tool-name-utils'
import { SplitButton } from '../common/SplitButton'

import { ObsidianCodeBlock } from './ObsidianMarkdown'

const STATUS_LABELS: Record<ToolCallResponseStatus, string> = {
  [ToolCallResponseStatus.PendingApproval]: 'Call',
  [ToolCallResponseStatus.Rejected]: 'Rejected',
  [ToolCallResponseStatus.Running]: 'Running',
  [ToolCallResponseStatus.Success]: 'Called',
  [ToolCallResponseStatus.Error]: 'Failed',
  [ToolCallResponseStatus.Aborted]: 'Aborted',
}

export default function ToolMessage({
  message,
  onMessageUpdate,
}: {
  message: ChatToolMessage
  onMessageUpdate: (message: ChatToolMessage) => void
}) {
  return (
    <div className="smtcmp-toolcall-container">
      {message.toolCalls.map((toolCall, index) => (
        <div
          key={toolCall.request.id}
          className={clsx(index > 0 && 'smtcmp-toolcall-border-top')}
        >
          <ToolCallItem
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
        </div>
      ))}
    </div>
  )
}

function ToolCallItem({
  request,
  response,
  onResponseUpdate,
}: {
  request: ToolCallRequest
  response: ToolCallResponse
  onResponseUpdate: (response: ToolCallResponse) => void
}) {
  const {
    handleToolCall,
    handleAllowAutoExecution,
    handleReject,
    handleAbort,
  } = useToolCall(request, onResponseUpdate)

  const [isOpen, setIsOpen] = useState(
    // Open by default if the tool call requires approval
    response.status === ToolCallResponseStatus.PendingApproval,
  )

  const { serverName, toolName } = useMemo(
    () => parseToolName(request.name),
    [request.name],
  )
  const parameters = useMemo(() => {
    if (!request.arguments) {
      return 'No parameters'
    }
    try {
      return JSON.stringify(JSON.parse(request.arguments), null, 2)
    } catch (error) {
      return request.arguments
    }
  }, [request.arguments])

  return (
    <div className="smtcmp-toolcall">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="smtcmp-toolcall-header"
      >
        <div className="smtcmp-toolcall-header-icon">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
        <div className="smtcmp-toolcall-header-content">
          <span>{STATUS_LABELS[response.status] || 'Unknown'}</span>
          <span>&nbsp;&nbsp;</span>
          <span className="smtcmp-toolcall-header-tool-name">
            {serverName}:{toolName}
          </span>
        </div>
        <div className="smtcmp-toolcall-header-icon smtcmp-toolcall-header-icon--status">
          <StatusIcon status={response.status} />
        </div>
      </div>
      {isOpen && (
        <div className="smtcmp-toolcall-content">
          <div className="smtcmp-toolcall-content-section">
            <div>Parameters:</div>
            <ObsidianCodeBlock language="json" content={parameters} />
          </div>
          {response.status === ToolCallResponseStatus.Success && (
            <div className="smtcmp-toolcall-content-section">
              <div>Result:</div>
              <ObsidianCodeBlock content={response.data.text} />
            </div>
          )}
          {response.status === ToolCallResponseStatus.Error && (
            <div className="smtcmp-toolcall-content-section">
              <div>Error:</div>
              <ObsidianCodeBlock content={response.error} />
            </div>
          )}
        </div>
      )}
      {(response.status === ToolCallResponseStatus.PendingApproval ||
        response.status === ToolCallResponseStatus.Running) && (
        <div className="smtcmp-toolcall-footer">
          {response.status === ToolCallResponseStatus.PendingApproval && (
            <div className="smtcmp-toolcall-footer-actions">
              <SplitButton
                primaryText="Allow"
                onPrimaryClick={() => {
                  handleToolCall()
                  setIsOpen(false)
                }}
                menuOptions={[
                  // TODO: Add option to allow in current chat session
                  {
                    label: 'Always allow this tool',
                    onClick: () => {
                      handleToolCall()
                      handleAllowAutoExecution()
                      setIsOpen(false)
                    },
                  },
                ]}
              />
              <button
                onClick={() => {
                  handleReject()
                  setIsOpen(false)
                }}
              >
                Reject
              </button>
            </div>
          )}
          {response.status === ToolCallResponseStatus.Running && (
            <div className="smtcmp-toolcall-footer-actions">
              <button onClick={handleAbort}>Abort</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function useToolCall(
  request: ToolCallRequest,
  onResponseUpdate: (response: ToolCallResponse) => void,
) {
  const { settings, setSettings } = useSettings()
  const { getMcpManager } = useMcp()

  const handleToolCall = useCallback(async () => {
    const mcpManager = await getMcpManager()
    onResponseUpdate({
      status: ToolCallResponseStatus.Running,
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

  return {
    handleToolCall,
    handleAllowAutoExecution,
    handleReject,
    handleAbort,
  }
}

function StatusIcon({ status }: { status: ToolCallResponseStatus }) {
  switch (status) {
    case ToolCallResponseStatus.PendingApproval:
      return null
    case ToolCallResponseStatus.Rejected:
    case ToolCallResponseStatus.Aborted:
    case ToolCallResponseStatus.Error:
      return <X size={16} style={{ color: 'var(--text-error)' }} />
    case ToolCallResponseStatus.Running:
      return <Loader2 size={16} className="spinner" />
    case ToolCallResponseStatus.Success:
      return <Check size={16} style={{ color: 'var(--text-success)' }} />
    default:
      return null
  }
}
