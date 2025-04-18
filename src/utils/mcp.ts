import type { Client as ClientType } from '@modelcontextprotocol/sdk/client/index.js'
import type { StdioServerParameters } from '@modelcontextprotocol/sdk/client/stdio.js'
import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types'
import { Platform } from 'obsidian'

const MOCK_MCP_SERVERS: Record<string, StdioServerParameters> = {
  filesystem: {
    command: 'npx',
    args: [
      '-y',
      '@modelcontextprotocol/server-filesystem',
      '/Users/kwanghyunon/Desktop',
      '/Users/kwanghyunon/Downloads',
      '/Users/kwanghyunon/Dropbox',
    ],
  },
  perplexityAsk: {
    command: 'npx',
    args: ['-y', 'server-perplexity-ask'],
    env: {
      PERPLEXITY_API_KEY: 'PERPLEXITY_API_KEY',
    },
  },
  todoist: {
    command: 'npx',
    args: ['-y', '@abhiz123/todoist-mcp-server'],
    env: {
      TODOIST_API_TOKEN: 'TODOIST_API_TOKEN',
    },
  },
}

export class MCPManager {
  private disabled = !Platform.isDesktop // MCP should be disabled on mobile since it doesn't support node.js
  private defaultEnv: Record<string, string>
  private clients: Record<string, ClientType> = {}
  private activeToolCalls: Map<string, AbortController> = new Map()

  private readonly DELIMITER = '---'

  public async initialize() {
    if (this.disabled) {
      return
    }

    const { shellEnvSync } = await import('shell-env')
    this.defaultEnv = shellEnvSync()

    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js')
    const { StdioClientTransport } = await import(
      '@modelcontextprotocol/sdk/client/stdio.js'
    )

    for (const [name, serverParams] of Object.entries(MOCK_MCP_SERVERS)) {
      if (name.includes(this.DELIMITER)) {
        console.error(
          `MCP server name ${name} contains the delimiter ${this.DELIMITER}. This is not allowed.`,
        )
        continue
      }
      const client = new Client({
        name,
        version: '1.0.0',
      })
      await client.connect(
        new StdioClientTransport({
          ...serverParams,
          env: {
            ...this.defaultEnv,
            ...(serverParams.env ?? {}),
          },
        }),
      )
      this.clients[name] = client
    }
  }

  public async listTools(): Promise<Tool[]> {
    if (this.disabled) {
      return []
    }
    const tools: Tool[] = []
    for (const [clientName, client] of Object.entries(this.clients)) {
      const toolList = await client.listTools()
      tools.push(
        ...toolList.tools.map((tool) => ({
          ...tool,
          name: this.getToolName(clientName, tool.name),
        })),
      )
    }
    return tools
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
      const { clientName, toolName } = this.parseToolName(name)
      const client = this.clients[clientName]

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
    clientName: string
    toolName: string
  } {
    const regex = new RegExp(`^(.+?)${this.DELIMITER}(.+)$`)
    const match = name.match(regex)

    if (!match || match.length < 3) {
      throw new Error(`Invalid tool name: ${name}`)
    }

    const clientName = match[1]
    const toolName = match[2]

    if (!clientName || !toolName) {
      throw new Error(`Invalid tool name: ${name}`)
    }

    return { clientName, toolName }
  }

  private getToolName(clientName: string, toolName: string): string {
    return `${clientName}${this.DELIMITER}${toolName}`
  }
}
