import { App } from 'obsidian'
import { useCallback, useEffect, useState } from 'react'

import { useSettings } from '../../../contexts/settings-context'
import SmartComposerPlugin from '../../../main'
import {
  McpServerState,
  McpServerStatus,
  McpTool,
} from '../../../types/mcp.types'
import { McpManager } from '../../../utils/mcp/mcpManager'
import { ObsidianButton } from '../../common/ObsidianButton'
import { ObsidianToggle } from '../../common/ObsidianToggle'
import { AddMcpServerModal, EditMcpServerModal } from '../McpServerModal'

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

      <ObsidianButton
        text="Add MCP Server"
        onClick={() => new AddMcpServerModal(app, plugin).open()}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {mcpServers.map((server) => (
          <MCPServer
            key={server.name}
            server={server}
            onEdit={() =>
              new EditMcpServerModal(app, plugin, server.name).open()
            }
          />
        ))}
      </div>
    </div>
  )
}

function MCPServer({
  server,
  onEdit,
}: {
  server: McpServerState
  onEdit: () => void
}) {
  const { settings, setSettings } = useSettings()

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

  const handleDelete = useCallback(() => {
    setSettings({
      ...settings,
      mcp: {
        ...settings.mcp,
        servers: settings.mcp.servers.filter((s) => s.id !== server.name),
      },
    })
  }, [settings, setSettings, server.name])

  return (
    <div>
      <div>{server.name}</div>
      <div>{server.status}</div>
      {server.status === McpServerStatus.Error && (
        <div>{server.error.message}</div>
      )}
      <ObsidianToggle
        value={server.config.enabled}
        onChange={handleToggleEnabled}
      />
      <button onClick={onEdit}>Edit</button>
      <button onClick={handleDelete}>Delete</button>
      {server.status === McpServerStatus.Connected && (
        <div>
          <div>Tools</div>
          {server.tools.map((tool) => (
            <McpToolComponent key={tool.name} tool={tool} server={server} />
          ))}
        </div>
      )}
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
    const toolOptions = server.config.toolOptions
    toolOptions[tool.name] = {
      disabled: disabled,
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div>{tool.name}</div>
      <ObsidianToggle
        value={!disabled}
        onChange={(value) => handleToggleEnabled(value)}
      />
      <ObsidianToggle
        value={allowAutoExecution}
        onChange={(value) => handleToggleAutoExecution(value)}
      />
    </div>
  )
}
