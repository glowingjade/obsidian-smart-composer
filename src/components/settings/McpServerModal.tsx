import { App, Modal, Notice } from 'obsidian'
import { useCallback, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import TextareaAutosize from 'react-textarea-autosize'
import * as z from 'zod'

import SmartComposerPlugin from '../../main'
import {
  McpServerParameters,
  mcpServerParametersSchema,
} from '../../types/mcp.types'
import { validateServerName } from '../../utils/mcp/tool-name-utils'
import { ObsidianButton } from '../common/ObsidianButton'
import { ObsidianSetting } from '../common/ObsidianSetting'
import { ObsidianTextInput } from '../common/ObsidianTextInput'

function McpServerFormComponent({
  plugin,
  onClose,
  serverId,
}: {
  plugin: SmartComposerPlugin
  onClose: () => void
  serverId?: string
}) {
  const existingServer = serverId
    ? plugin.settings.mcp.servers.find((server) => server.id === serverId)
    : undefined

  const [name, setName] = useState(existingServer?.id ?? '')
  const [parameters, setParameters] = useState(
    existingServer ? JSON.stringify(existingServer.parameters, null, 2) : '',
  )
  const [validationError, setValidationError] = useState<string | null>(null)

  const PARAMETERS_PLACEHOLDER = JSON.stringify(
    {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: '<YOUR_TOKEN>',
      },
    },
    null,
    2,
  )

  const handleSubmit = async () => {
    try {
      const serverName = name.trim()
      if (serverName.length === 0) {
        throw new Error('Name is required')
      }
      validateServerName(serverName)

      if (
        plugin.settings.mcp.servers.find(
          (server) =>
            server.id === serverName && server.id !== existingServer?.id,
        )
      ) {
        throw new Error('Server with same name already exists')
      }

      const parsedParameters = JSON.parse(parameters)
      const validatedParameters: McpServerParameters = mcpServerParametersSchema
        .strict()
        .parse(parsedParameters)

      const newSettings = {
        ...plugin.settings,
        mcp: {
          ...plugin.settings.mcp,
          servers: existingServer
            ? plugin.settings.mcp.servers.map((server) =>
                server.id === existingServer.id
                  ? { id: serverName, parameters: validatedParameters }
                  : server,
              )
            : [
                ...plugin.settings.mcp.servers,
                { id: serverName, parameters: validatedParameters },
              ],
        },
      }

      await plugin.setSettings(newSettings)

      onClose()
    } catch (error) {
      if (error instanceof Error) {
        new Notice(error.message)
      } else {
        console.error(error)
        new Notice('Failed to add MCP server.')
      }
    }
  }

  const validateParameters = useCallback((parameters: string) => {
    try {
      if (parameters.length === 0) {
        setValidationError(null)
        return
      }
      const parsedParameters = JSON.parse(parameters)
      mcpServerParametersSchema.strict().parse(parsedParameters)
      setValidationError(null)
    } catch (error) {
      if (error instanceof SyntaxError) {
        // JSON parse error
        setValidationError('Invalid JSON format')
      } else if (error instanceof z.ZodError) {
        // Zod error
        const formattedErrors = error.errors
          .map((err) => {
            const path = err.path.length > 0 ? `${err.path.join('.')}: ` : ''
            return `${path}${err.message}`
          })
          .join('\n')
        setValidationError(formattedErrors)
      } else {
        setValidationError(
          error instanceof Error ? error.message : 'Invalid parameters',
        )
      }
    }
  }, [])

  useEffect(() => {
    validateParameters(parameters)
  }, [parameters, validateParameters])

  return (
    <>
      <ObsidianSetting name="Name" desc="The name of the MCP server" required>
        <ObsidianTextInput
          value={name}
          onChange={(value: string) => setName(value)}
          placeholder="e.g. 'github'"
        />
      </ObsidianSetting>

      <ObsidianSetting
        name="Parameters"
        desc={`JSON configuration that defines how to run the MCP server. Format must include:
- "command": The executable name (e.g., "npx", "node")
- "args": (Optional) Array of command-line arguments
- "env": (Optional) Key-value pairs of environment variables`}
        className="smtcmp-settings-textarea-header smtcmp-settings-description-preserve-whitespace"
        required
      />
      <ObsidianSetting className="smtcmp-settings-textarea">
        <TextareaAutosize
          value={parameters}
          placeholder={PARAMETERS_PLACEHOLDER}
          onChange={(e) => setParameters(e.target.value)}
          style={{
            width: '100%',
            fontFamily: 'var(--font-monospace)',
            resize: 'none',
            wordBreak: 'break-all',
          }}
          maxRows={20}
          minRows={PARAMETERS_PLACEHOLDER.split('\n').length}
        />
        {validationError !== null ? (
          <div style={{ color: 'red', whiteSpace: 'pre-wrap' }}>
            {validationError}
          </div>
        ) : parameters.length > 0 ? (
          <div style={{ color: 'green' }}>Valid parameters</div>
        ) : null}
      </ObsidianSetting>

      <ObsidianSetting>
        <ObsidianButton text="Save" onClick={handleSubmit} cta />
        <ObsidianButton text="Cancel" onClick={onClose} />
      </ObsidianSetting>
    </>
  )
}

export class AddMcpServerModal extends Modal {
  private plugin: SmartComposerPlugin
  private root: ReturnType<typeof createRoot> | null = null

  constructor(app: App, plugin: SmartComposerPlugin) {
    super(app)
    this.plugin = plugin
  }

  onOpen() {
    const { contentEl } = this
    contentEl.empty()
    this.titleEl.setText(`Add MCP Server`)

    this.root = createRoot(contentEl)

    this.root.render(
      <McpServerFormComponent
        plugin={this.plugin}
        onClose={() => this.close()}
      />,
    )
  }

  onClose() {
    if (this.root) {
      this.root.unmount()
      this.root = null
    }
    const { contentEl } = this
    contentEl.empty()
  }
}

export class EditMcpServerModal extends Modal {
  private plugin: SmartComposerPlugin
  private root: ReturnType<typeof createRoot> | null = null
  private editServerId: string

  constructor(app: App, plugin: SmartComposerPlugin, editServerId: string) {
    super(app)
    this.plugin = plugin
    this.editServerId = editServerId
  }

  onOpen() {
    const { contentEl } = this
    contentEl.empty()
    this.titleEl.setText(`Edit MCP Server`)

    this.root = createRoot(contentEl)

    this.root.render(
      <McpServerFormComponent
        plugin={this.plugin}
        onClose={() => this.close()}
        serverId={this.editServerId}
      />,
    )
  }

  onClose() {
    if (this.root) {
      this.root.unmount()
      this.root = null
    }
    const { contentEl } = this
    contentEl.empty()
  }
}
