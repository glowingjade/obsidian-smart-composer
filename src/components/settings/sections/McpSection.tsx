import {
  Check,
  ChevronDown,
  ChevronUp,
  CircleMinus,
  Edit,
  Loader2,
  Trash2,
  X,
} from 'lucide-react'
import { App } from 'obsidian'
import { useCallback, useEffect, useState } from 'react'

import { useSettings } from '../../../contexts/settings-context'
import { McpManager } from '../../../core/mcp/mcpManager'
import SmartComposerPlugin from '../../../main'
import {
  McpServerState,
  McpServerStatus,
  McpTool,
} from '../../../types/mcp.types'
import { ObsidianButton } from '../../common/ObsidianButton'
import { ObsidianToggle } from '../../common/ObsidianToggle'
import { ConfirmModal } from '../../modals/ConfirmModal'
import {
  AddMcpServerModal,
  EditMcpServerModal,
} from '../modals/McpServerFormModal'

type McpSectionProps = {
  app: App
  plugin: SmartComposerPlugin
}

export function McpSection({ app, plugin }: McpSectionProps) {
  const [mcpManager, setMcpManager] = useState<McpManager | null>(null)
  const [mcpServers, setMcpServers] = useState<McpServerState[]>([])

  useEffect(() => {
    const initMCPManager = async () => {
      const mcpManager = await plugin.getMcpManager()
      setMcpManager(mcpManager)
      setMcpServers(mcpManager.getServers())
    }
    initMCPManager()
  }, [plugin])

  useEffect(() => {
    if (mcpManager) {
      const unsubscribe = mcpManager.subscribeServersChange((servers) => {
        setMcpServers(servers)
      })
      return () => {
        unsubscribe()
      }
    }
  }, [mcpManager])

  return (
    <div className="smtcmp-settings-section">
      <div className="smtcmp-settings-header">MCP (Model Context Pool)</div>

      <div className="smtcmp-settings-desc smtcmp-settings-callout">
        <strong>Warning:</strong> When using tools, the tool response is passed
        to the language model (LLM). If the tool result contains a large amount
        of content, this can significantly increase LLM usage and associated
        costs. Please be mindful when enabling or using tools that may return
        long outputs.
      </div>

      {mcpManager?.disabled ? (
        <div className="smtcmp-settings-sub-header-container">
          <div className="smtcmp-settings-sub-header">
            MCP is not supported on mobile devices
          </div>
        </div>
      ) : (
        <>
          <div className="smtcmp-settings-sub-header-container">
            <div className="smtcmp-settings-sub-header">MCP Servers</div>
            <ObsidianButton
              text="Add MCP Server"
              onClick={() => new AddMcpServerModal(app, plugin).open()}
            />
          </div>

          <div className="smtcmp-mcp-servers-container">
            <div className="smtcmp-mcp-servers-header">
              <div>Server</div>
              <div>Status</div>
              <div>Enabled</div>
              <div>Actions</div>
            </div>
            {mcpServers.length > 0 ? (
              mcpServers.map((server) => (
                <McpServerComponent
                  key={server.name}
                  server={server}
                  app={app}
                  plugin={plugin}
                />
              ))
            ) : (
              <div className="smtcmp-mcp-servers-empty">
                No MCP servers found
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function McpServerComponent({
  server,
  app,
  plugin,
}: {
  server: McpServerState
  app: App
  plugin: SmartComposerPlugin
}) {
  const { settings, setSettings } = useSettings()
  const [isOpen, setIsOpen] = useState(false)

  const handleEdit = useCallback(() => {
    new EditMcpServerModal(app, plugin, server.name).open()
  }, [server.name, app, plugin])

  const handleDelete = useCallback(() => {
    const message = `Are you sure you want to delete MCP server "${server.name}"?`
    new ConfirmModal(app, {
      title: 'Delete MCP Server',
      message: message,
      ctaText: 'Delete',
      onConfirm: async () => {
        await setSettings({
          ...settings,
          mcp: {
            ...settings.mcp,
            servers: settings.mcp.servers.filter((s) => s.id !== server.name),
          },
        })
      },
    }).open()
  }, [server.name, settings, setSettings, app])

  const handleToggleEnabled = useCallback(
    (enabled: boolean) => {
      setSettings({
        ...settings,
        mcp: {
          ...settings.mcp,
          servers: settings.mcp.servers.map((s) =>
            s.id === server.name ? { ...s, enabled } : s,
          ),
        },
      })
    },
    [settings, setSettings, server.name],
  )

  return (
    <div className="smtcmp-mcp-server">
      <div className="smtcmp-mcp-server-row">
        <div className="smtcmp-mcp-server-name">{server.name}</div>
        <div className="smtcmp-mcp-server-status">
          <McpServerStatusBadge status={server.status} />
        </div>
        <div className="smtcmp-mcp-server-toggle">
          <ObsidianToggle
            value={server.config.enabled}
            onChange={handleToggleEnabled}
          />
        </div>
        <div className="smtcmp-mcp-server-actions">
          <button
            onClick={handleEdit}
            className="clickable-icon"
            aria-label="Edit"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={handleDelete}
            className="clickable-icon"
            aria-label="Delete"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="clickable-icon"
            aria-label={isOpen ? 'Collapse' : 'Expand'}
          >
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>
      {isOpen && <ExpandedServerInfo server={server} />}
    </div>
  )
}

function ExpandedServerInfo({ server }: { server: McpServerState }) {
  if (
    server.status === McpServerStatus.Disconnected ||
    server.status === McpServerStatus.Connecting
  ) {
    return null
  }

  return (
    <div className="smtcmp-server-expanded-info">
      {server.status === McpServerStatus.Connected && (
        <div>
          <div className="smtcmp-server-expanded-info-header">Tools</div>
          <div className="smtcmp-server-tools-container">
            {server.tools.map((tool) => (
              <McpToolComponent key={tool.name} tool={tool} server={server} />
            ))}
          </div>
        </div>
      )}
      {server.status === McpServerStatus.Error && (
        <div>
          <div className="smtcmp-server-expanded-info-header">Error</div>
          <div className="smtcmp-server-error-message">
            {server.error.message}
          </div>
        </div>
      )}
    </div>
  )
}

function McpServerStatusBadge({ status }: { status: McpServerStatus }) {
  const statusConfig = {
    [McpServerStatus.Connected]: {
      icon: <Check size={16} />,
      label: 'Connected',
      statusClass: 'smtcmp-mcp-server-status-badge--connected',
    },
    [McpServerStatus.Connecting]: {
      icon: <Loader2 size={16} className="spinner" />,
      label: 'Connecting...',
      statusClass: 'smtcmp-mcp-server-status-badge--connecting',
    },
    [McpServerStatus.Error]: {
      icon: <X size={16} />,
      label: 'Error',
      statusClass: 'smtcmp-mcp-server-status-badge--error',
    },
    [McpServerStatus.Disconnected]: {
      icon: <CircleMinus size={14} />,
      label: 'Disconnected',
      statusClass: 'smtcmp-mcp-server-status-badge--disconnected',
    },
  }

  const { icon, label, statusClass } = statusConfig[status]

  return (
    <div className={`smtcmp-mcp-server-status-badge ${statusClass}`}>
      {icon}
      <div className="smtcmp-mcp-server-status-badge-label">{label}</div>
    </div>
  )
}

function McpToolComponent({
  tool,
  server,
}: {
  tool: McpTool
  server: McpServerState
}) {
  const { settings, setSettings } = useSettings()

  const toolOption = server.config.toolOptions[tool.name]
  const disabled = toolOption?.disabled ?? false
  const allowAutoExecution = toolOption?.allowAutoExecution ?? false

  const handleToggleEnabled = (enabled: boolean) => {
    const toolOptions = server.config.toolOptions
    toolOptions[tool.name] = {
      disabled: !enabled,
      allowAutoExecution: allowAutoExecution,
    }
    setSettings({
      ...settings,
      mcp: {
        ...settings.mcp,
        servers: settings.mcp.servers.map((s) =>
          s.id === server.name
            ? {
                ...s,
                toolOptions: toolOptions,
              }
            : s,
        ),
      },
    })
  }

  const handleToggleAutoExecution = (autoExecution: boolean) => {
    const toolOptions = { ...server.config.toolOptions }
    toolOptions[tool.name] = {
      ...toolOptions[tool.name],
      allowAutoExecution: autoExecution,
    }
    setSettings({
      ...settings,
      mcp: {
        ...settings.mcp,
        servers: settings.mcp.servers.map((s) =>
          s.id === server.name
            ? {
                ...s,
                toolOptions: toolOptions,
              }
            : s,
        ),
      },
    })
  }

  return (
    <div className="smtcmp-mcp-tool">
      <div className="smtcmp-mcp-tool-info">
        <div className="smtcmp-mcp-tool-name">{tool.name}</div>
        <div className="smtcmp-mcp-tool-description">{tool.description}</div>
      </div>
      <div className="smtcmp-mcp-tool-toggle">
        <span className="smtcmp-mcp-tool-toggle-label">Enabled</span>
        <ObsidianToggle
          value={!disabled}
          onChange={(value) => handleToggleEnabled(value)}
        />
      </div>
      <div className="smtcmp-mcp-tool-toggle">
        <span className="smtcmp-mcp-tool-toggle-label">Auto-execute</span>
        <ObsidianToggle
          value={allowAutoExecution}
          onChange={(value) => handleToggleAutoExecution(value)}
        />
      </div>
    </div>
  )
}
