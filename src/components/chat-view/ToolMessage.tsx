import clsx from 'clsx'
import { Check, ChevronDown, ChevronRight, Loader2, X } from 'lucide-react'
import { memo, useCallback, useMemo, useRef, useState } from 'react'

import { useApp } from '../../contexts/app-context'
import { useMcp } from '../../contexts/mcp-context'
import { useRAG } from '../../contexts/rag-context'
import { useSettings } from '../../contexts/settings-context'
import { InvalidToolNameException } from '../../core/mcp/exception'
import { parseToolName } from '../../core/mcp/tool-name-utils'
import { VaultTools } from '../../core/vault-tools/vaultTools'
import { ChatToolMessage } from '../../types/chat'
import { parseToolArgs } from '../../utils/tool-args'
import {
  ToolCallRequest,
  ToolCallResponse,
  ToolCallResponseStatus,
} from '../../types/tool-call.types'
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

export const getToolMessageContent = (message: ChatToolMessage): string => {
  return message.toolCalls
    ?.map((toolCall) => {
      const { serverName, toolName } = (() => {
        try {
          return parseToolName(toolCall.request.name)
        } catch (error) {
          if (error instanceof InvalidToolNameException) {
            return { serverName: null, toolName: toolCall.request.name }
          }
          throw error
        }
      })()
      return [
        `${STATUS_LABELS[toolCall.response.status]} ${serverName ? `${serverName}:${toolName}` : toolName}`,
        ...(toolCall.request.arguments
          ? [`Parameters: ${toolCall.request.arguments}`]
          : []),
      ].join('\n')
    })
    .join('\n')
}

const ToolMessage = memo(function ToolMessage({
  message,
  conversationId,
  onMessageUpdate,
}: {
  message: ChatToolMessage
  conversationId: string
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
            conversationId={conversationId}
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
})

function ToolCallItem({
  request,
  response,
  conversationId,
  onResponseUpdate,
}: {
  request: ToolCallRequest
  response: ToolCallResponse
  conversationId: string
  onResponseUpdate: (response: ToolCallResponse) => void
}) {
  const {
    isVaultTool,
    handleToolCall,
    handleAllowForConversation,
    handleAllowAutoExecution,
    handleReject,
    handleAbort,
  } = useToolCall(request, conversationId, onResponseUpdate)

  const [isOpen, setIsOpen] = useState(
    // Open by default if the tool call requires approval
    response.status === ToolCallResponseStatus.PendingApproval,
  )

  const { serverName, toolName } = useMemo(() => {
    try {
      return parseToolName(request.name)
    } catch (error) {
      if (error instanceof InvalidToolNameException) {
        return {
          serverName: null,
          toolName: request.name,
        }
      }
      throw error
    }
  }, [request.name])
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
            {serverName ? `${serverName}:${toolName}` : toolName}
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
                menuOptions={
                  isVaultTool
                    ? []
                    : [
                        {
                          label: 'Always allow this tool',
                          onClick: () => {
                            handleToolCall()
                            handleAllowAutoExecution()
                            setIsOpen(false)
                          },
                        },
                        {
                          label: 'Allow for this chat',
                          onClick: () => {
                            handleToolCall()
                            handleAllowForConversation()
                            setIsOpen(false)
                          },
                        },
                      ]
                }
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
  conversationId: string,
  onResponseUpdate: (response: ToolCallResponse) => void,
) {
  const { settings, setSettings } = useSettings()
  const { getMcpManager } = useMcp()
  const app = useApp()
  const { getRAGEngine } = useRAG()
  const vaultTools = useMemo(
    () => new VaultTools(app, getRAGEngine),
    [app, getRAGEngine],
  )
  const isVaultTool = useMemo(
    () => vaultTools.isNativeTool(request.name),
    [vaultTools, request.name],
  )
  const abortControllerRef = useRef<AbortController | null>(null)
  const toolCallSettledRef = useRef(false)

  const handleToolCall = useCallback(async () => {
    const controller = new AbortController()
    abortControllerRef.current = controller
    toolCallSettledRef.current = false
    onResponseUpdate({
      status: ToolCallResponseStatus.Running,
    })
    let toolCallResponse: ToolCallResponse
    if (isVaultTool) {
      const parsedArgs = parseToolArgs(request.arguments)
      if (parsedArgs === null) {
        toolCallSettledRef.current = true
        onResponseUpdate({
          status: ToolCallResponseStatus.Error,
          error: `Invalid tool arguments: ${request.arguments}`,
        })
        return
      }
      toolCallResponse = await vaultTools.callTool(request.name, parsedArgs, controller.signal)
    } else {
      const mcpManager = await getMcpManager()
      toolCallResponse = await mcpManager.callTool({
        name: request.name,
        args: request.arguments,
        id: request.id,
      })
    }
    if (!controller.signal.aborted) {
      toolCallSettledRef.current = true
      onResponseUpdate(toolCallResponse)
    }
  }, [request, onResponseUpdate, getMcpManager, isVaultTool, vaultTools])

  const handleAllowForConversation = useCallback(async () => {
    if (isVaultTool) return
    const mcpManager = await getMcpManager()
    mcpManager.allowToolForConversation(request.name, conversationId)
  }, [request, conversationId, getMcpManager, isVaultTool])

  const handleAllowAutoExecution = useCallback(async () => {
    if (isVaultTool) return
    const { serverName, toolName } = parseToolName(request.name)
    const server = settings.mcp.servers.find((s) => s.id === serverName)
    if (!server) {
      throw new Error(`Server ${serverName} not found`)
    }
    const toolOptions = { ...server.toolOptions }
    if (!toolOptions[toolName]) {
      toolOptions[toolName] = {
        allowAutoExecution: false,
        disabled: false,
      }
    }
    toolOptions[toolName] = {
      ...toolOptions[toolName],
      allowAutoExecution: true,
    }

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
  }, [request, settings, setSettings, isVaultTool])

  const handleReject = useCallback(async () => {
    onResponseUpdate({
      status: ToolCallResponseStatus.Rejected,
    })
  }, [onResponseUpdate])

  const handleAbort = useCallback(async () => {
    abortControllerRef.current?.abort()
    if (!isVaultTool) {
      const mcpManager = await getMcpManager()
      mcpManager.abortToolCall(request.id)
    }
    if (!toolCallSettledRef.current) {
      onResponseUpdate({
        status: ToolCallResponseStatus.Aborted,
      })
    }
  }, [request, onResponseUpdate, getMcpManager, isVaultTool])

  return {
    isVaultTool,
    handleToolCall,
    handleAllowForConversation,
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

export default ToolMessage
