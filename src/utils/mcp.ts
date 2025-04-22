import type { Client as ClientType } from '@modelcontextprotocol/sdk/client/index.js'
import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types'
import { Platform } from 'obsidian'

import { SmartComposerSettings } from '../settings/schema/setting.types'
import { MCPServerConfig } from '../types/mcp.types'

export type MCPServerState = {
  name: string
  client: ClientType
  status: 'stopped' | 'connecting' | 'connected' | 'error'
  tools?: Tool[]
  error?: Error
}

export class MCPManager {
  private readonly disabled = !Platform.isDesktop // MCP should be disabled on mobile since it doesn't support node.js

  private readonly settings: SmartComposerSettings
  private readonly DELIMITER = '---'

  private defaultEnv: Record<string, string>
  private servers: MCPServerState[] = []
  private activeToolCalls: Map<string, AbortController> = new Map()
  private subscribers = new Set<(servers: MCPServerState[]) => void>()

  constructor({ settings }: { settings: SmartComposerSettings }) {
    this.settings = settings
  }

  public async initialize() {
    if (this.disabled) {
      return
    }

    // Get default environment variables
    const { shellEnvSync } = await import('shell-env')
    this.defaultEnv = shellEnvSync()

    // Create MCP servers
    const servers = await Promise.all(
      this.settings.mcp.servers.map((serverConfig) =>
        this.createServer(serverConfig),
      ),
    )
    this.updateServers(servers)
    console.log('Initialized MCP servers', servers)
  }

  public getServers() {
    return this.servers
  }

  public subscribeServersChange(cb: (servers: MCPServerState[]) => void) {
    this.subscribers.add(cb)
    return () => this.subscribers.delete(cb)
  }

  public async connectServer(name: string) {
    const serverConfig = this.settings.mcp.servers.find(
      (server) => server.id === name,
    )
    if (!serverConfig) {
      throw new Error(`MCP server ${name} not found`)
    }

    const server = this.servers.find((server) => server.name === name)
    if (server?.status === 'connected') {
      return
    }
    this.updateServers(
      this.servers.map((s) =>
        s.name === name ? { ...s, status: 'connecting' } : s,
      ),
    )
    const updatedServer = await this.createServer(serverConfig)
    this.updateServers([
      ...this.servers.map((s) => (s.name === name ? updatedServer : s)),
    ])
  }

  public async disconnectServer(name: string) {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js')
    const server = this.servers.find((server) => server.name === name)
    if (!server) {
      return
    }
    try {
      await server.client.close()
      this.updateServers(
        this.servers.map((s) =>
          s.name === server.name
            ? {
                name: server.name,
                client: server.client,
                status: 'stopped',
                tools: undefined,
                error: undefined,
              }
            : s,
        ),
      )
    } catch (error) {
      // Reset the client
      this.updateServers(
        this.servers.map((s) =>
          s.name === name
            ? {
                ...s,
                client: new Client({ name, version: '1.0.0' }),
                status: 'stopped',
                tools: undefined,
                error: undefined,
              }
            : s,
        ),
      )
    }
  }

  private notifySubscribers() {
    for (const cb of this.subscribers) cb(this.servers)
  }

  private updateServers(servers: MCPServerState[]) {
    this.servers = servers
    this.notifySubscribers()
  }

  private async createServer(
    serverConfig: MCPServerConfig,
  ): Promise<MCPServerState> {
    console.log('Creating server', serverConfig)
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js')
    const { StdioClientTransport } = await import(
      '@modelcontextprotocol/sdk/client/stdio.js'
    )
    const { id: name, parameters: serverParams } = serverConfig
    const client = new Client({ name, version: '1.0.0' })

    if (name.includes(this.DELIMITER)) {
      return {
        name,
        client,
        status: 'error',
        error: new Error(
          `MCP server name ${name} contains the delimiter ${this.DELIMITER}. This is not allowed.`,
        ),
      }
    }

    try {
      await client.connect(
        new StdioClientTransport({
          ...serverParams,
          env: {
            ...this.defaultEnv,
            ...(serverParams.env ?? {}),
          },
        }),
      )
    } catch (error) {
      return {
        name,
        client,
        status: 'error',
        error: new Error(
          `Failed to connect to MCP server ${name}: ${error instanceof Error ? error.message : String(error)}`,
        ),
      }
    }

    try {
      const toolList = await client.listTools()
      return {
        name,
        status: 'connected',
        client,
        tools: toolList.tools,
      }
    } catch (error) {
      return {
        name,
        status: 'error',
        client,
        error: new Error(
          `Failed to list tools for MCP server ${name}: ${error instanceof Error ? error.message : String(error)}`,
        ),
      }
    }
  }

  public async listTools(): Promise<Tool[]> {
    if (this.disabled) {
      return []
    }
    return (
      await Promise.all(
        this.servers.map(async (server): Promise<Tool[]> => {
          if (server.status !== 'connected') {
            return []
          }
          try {
            const toolList = await server.client.listTools()
            return toolList.tools.map((tool) => ({
              ...tool,
              name: this.getToolName(server.name, tool.name),
            }))
          } catch (error) {
            console.error(
              `Failed to list tools for MCP server ${server.name}: ${error instanceof Error ? error.message : String(error)}`,
            )
            return []
          }
        }),
      )
    ).flat()
  }

  public async callTool({
    name,
    args,
    id,
    signal,
  }: {
    name: string
    args?: Record<string, unknown> | string | undefined
    id?: string
    signal?: AbortSignal
  }): Promise<
    | {
        status: 'success'
        data: {
          type: 'text'
          text: string
        }
      }
    | {
        status: 'error'
        error: string
      }
    | {
        status: 'aborted'
      }
  > {
    if (this.disabled) {
      throw new Error('MCP is not supported on mobile')
    }

    const toolAbortController = new AbortController()
    if (id !== undefined) {
      const existingAbortController = this.activeToolCalls.get(id)
      if (existingAbortController) {
        existingAbortController.abort()
      }
      this.activeToolCalls.set(id, toolAbortController)
    }
    const compositeSignal = toolAbortController.signal
    if (signal) {
      signal.addEventListener('abort', () => toolAbortController.abort())
    }

    console.log(`Calling tool ${name}: ${JSON.stringify(args)}`)

    try {
      const { serverName, toolName } = this.parseToolName(name)
      const server = this.servers.find((server) => server.name === serverName)
      if (!server) {
        throw new Error(`MCP server ${serverName} not found`)
      }
      const { client } = server

      const parsedArgs: Record<string, unknown> | undefined =
        typeof args === 'string' ? (args === '' ? {} : JSON.parse(args)) : args

      const result = (await client.callTool(
        {
          name: toolName,
          arguments: parsedArgs,
        },
        undefined,
        {
          signal: compositeSignal,
        },
      )) as CallToolResult

      if (result.content[0].type !== 'text') {
        throw new Error(
          `Tool result with content type ${result.content[0].type} is not currently supported.`,
        )
      }
      if (result.isError) {
        return {
          status: 'error',
          error: result.content[0].text,
        }
      }
      return {
        status: 'success',
        data: {
          type: 'text',
          text: result.content[0].text,
        },
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return {
          status: 'aborted',
        }
      }

      // Handle other errors
      return {
        status: 'error',
        error: error.message || 'Unknown error occurred',
      }
    } finally {
      if (id !== undefined) {
        this.activeToolCalls.delete(id)
      }
    }
  }

  public abortToolCall(id: string): boolean {
    if (this.disabled) {
      return false
    }
    const toolAbortController = this.activeToolCalls.get(id)
    if (toolAbortController) {
      toolAbortController.abort()
      this.activeToolCalls.delete(id)
      return true
    }
    return false
  }

  private parseToolName(name: string): {
    serverName: string
    toolName: string
  } {
    const regex = new RegExp(`^(.+?)${this.DELIMITER}(.+)$`)
    const match = name.match(regex)

    if (!match || match.length < 3) {
      throw new Error(`Invalid tool name: ${name}`)
    }

    const serverName = match[1]
    const toolName = match[2]

    if (!serverName || !toolName) {
      throw new Error(`Invalid tool name: ${name}`)
    }

    return { serverName, toolName }
  }

  private getToolName(serverName: string, toolName: string): string {
    return `${serverName}${this.DELIMITER}${toolName}`
  }
}
