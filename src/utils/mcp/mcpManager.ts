import type { Client as ClientType } from '@modelcontextprotocol/sdk/client/index.js'
import isEqual from 'lodash.isequal'
import { Platform } from 'obsidian'

import { SmartComposerSettings } from '../../settings/schema/setting.types'
import {
  McpServerConfig,
  McpTool,
  McpToolCallResponse,
} from '../../types/mcp.types'

import {
  getToolName,
  parseToolName,
  validateServerName,
} from './tool-name-utils'

export type McpServerState = {
  name: string
  client: ClientType
  config: McpServerConfig
  status: 'stopped' | 'connecting' | 'connected' | 'error'
  tools?: McpTool[]
  error?: Error
}

export class McpManager {
  private readonly disabled = !Platform.isDesktop // MCP should be disabled on mobile since it doesn't support node.js

  private settings: SmartComposerSettings

  private defaultEnv: Record<string, string>
  private servers: McpServerState[] = []
  private activeToolCalls: Map<string, AbortController> = new Map()
  private subscribers = new Set<(servers: McpServerState[]) => void>()
  private unsubscribeFromSettings: () => void

  constructor({
    settings,
    registerSettingsListener,
  }: {
    settings: SmartComposerSettings
    registerSettingsListener: (
      listener: (settings: SmartComposerSettings) => void,
    ) => () => void
  }) {
    this.settings = settings
    this.unsubscribeFromSettings = registerSettingsListener((newSettings) => {
      this.handleSettingsUpdate(newSettings)
    })
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
  }

  public cleanup() {
    if (this.unsubscribeFromSettings) {
      this.unsubscribeFromSettings()
    }
    // TODO: Close all connections
  }

  public getServers() {
    return this.servers
  }

  public subscribeServersChange(callback: (servers: McpServerState[]) => void) {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  public async handleSettingsUpdate(settings: SmartComposerSettings) {
    this.settings = settings
    const updatedServers = await Promise.all(
      settings.mcp.servers.map(async (serverConfig: McpServerConfig) => {
        const server = this.servers.find((s) => s.name === serverConfig.id)
        if (
          server &&
          isEqual(server.config.parameters, serverConfig.parameters)
        ) {
          // Server is already up to date
          return {
            ...server,
            config: serverConfig,
          }
        }
        return this.createServer(serverConfig)
      }),
    )
    this.updateServers(updatedServers)
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
                ...s,
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

  private updateServers(servers: McpServerState[]) {
    this.servers = servers
    this.notifySubscribers()
  }

  private async createServer(
    serverConfig: McpServerConfig,
  ): Promise<McpServerState> {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js')
    const { StdioClientTransport } = await import(
      '@modelcontextprotocol/sdk/client/stdio.js'
    )
    const { id: name, parameters: serverParams } = serverConfig
    const client = new Client({ name, version: '1.0.0' })

    try {
      validateServerName(name)
    } catch (error) {
      return {
        name,
        client,
        config: serverConfig,
        status: 'error',
        error: error as Error,
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
        config: serverConfig,
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
        client,
        config: serverConfig,
        status: 'connected',
        tools: toolList.tools,
      }
    } catch (error) {
      return {
        name,
        client,
        config: serverConfig,
        status: 'error',
        error: new Error(
          `Failed to list tools for MCP server ${name}: ${error instanceof Error ? error.message : String(error)}`,
        ),
      }
    }
  }

  public async listAvailableTools(): Promise<McpTool[]> {
    if (this.disabled) {
      return []
    }
    return (
      await Promise.all(
        this.servers.map(async (server): Promise<McpTool[]> => {
          if (server.status !== 'connected') {
            return []
          }
          try {
            const toolList = await server.client.listTools()
            return toolList.tools
              .filter(
                (tool) => !server.config.toolOptions?.[tool.name]?.disabled,
              )
              .map((tool) => ({
                ...tool,
                name: getToolName(server.name, tool.name),
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

  public isToolAutoExecutionAllowed(requestToolName: string): boolean {
    const { serverName, toolName } = parseToolName(requestToolName)
    const server = this.servers.find((server) => server.name === serverName)
    if (!server) {
      return false
    }
    const toolOption = server.config.toolOptions?.[toolName]
    if (!toolOption) {
      return false
    }
    return toolOption.allowAutoExecution ?? false
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
      const { serverName, toolName } = parseToolName(name)
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
      )) as McpToolCallResponse

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
}
