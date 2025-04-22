import { App } from 'obsidian'
import { useEffect, useState } from 'react'

import { useSettings } from '../../../contexts/settings-context'
import SmartComposerPlugin from '../../../main'
import { MCPManager, MCPServerState } from '../../../utils/mcp'

type MCPSectionProps = {
  app: App
  plugin: SmartComposerPlugin
}

export function MCPSection({ app, plugin }: MCPSectionProps) {
  const { settings, setSettings } = useSettings()

  const [mcpManager, setMcpManager] = useState<MCPManager | null>(null)
  const [mcpServers, setMcpServers] = useState<MCPServerState[]>([])

  useEffect(() => {
    const initMCPManager = async () => {
      const mcpManager = await plugin.getMCPManager()
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {mcpServers.map((server) => (
          <MCPServer
            key={server.name}
            server={server}
            onConnect={() => mcpManager?.connectServer(server.name)}
            onDisconnect={() => mcpManager?.disconnectServer(server.name)}
          />
        ))}
      </div>
    </div>
  )
}

function MCPServer({
  server,
  onConnect,
  onDisconnect,
}: {
  server: MCPServerState
  onConnect: () => void
  onDisconnect: () => void
}) {
  return (
    <div>
      <div>{server.name}</div>
      <div>{server.status}</div>
      {server.error && <div>{server.error.message}</div>}
      {server.tools && (
        <div>
          <div>Tools</div>
          {server.tools.map((tool) => (
            <div key={tool.name}>{tool.name}</div>
          ))}
        </div>
      )}
      {['connecting', 'connected'].includes(server.status) && (
        <button onClick={onDisconnect}>Disconnect</button>
      )}
      {['error', 'stopped'].includes(server.status) && (
        <button onClick={onConnect}>Connect</button>
      )}
    </div>
  )
}
