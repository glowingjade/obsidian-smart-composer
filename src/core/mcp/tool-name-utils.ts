import { InvalidToolNameException } from './exception'
import { McpManager } from './mcpManager'

const DEFAULT_DELIMITER = McpManager.TOOL_NAME_DELIMITER

/**
 * Validates that a server name follows the required format and doesn't contain the delimiter
 * @param name Server name to validate
 * @param delimiter Optional custom delimiter
 */
export function validateServerName(
  name: string,
  delimiter: string = DEFAULT_DELIMITER,
): void {
  // OpenAI only allows alphanumeric characters, underscores, and hyphens in the tool name
  const regex = /^[a-zA-Z0-9_-]+$/
  if (!regex.test(name)) {
    throw new Error(
      `Invalid MCP server name: ${name}. Only alphanumeric characters, underscores, and hyphens are allowed.`,
    )
  }
  // Server names cannot contain it to ensure proper parsing and formatting
  if (name.includes(delimiter)) {
    throw new Error(
      `MCP server name ${name} should not contain the delimiter ${delimiter}.`,
    )
  }
}

/**
 * Parses a combined tool name into server name and tool name components
 * @param name Combined tool name to parse
 * @param delimiter Optional custom delimiter
 */
export function parseToolName(
  name: string,
  delimiter: string = DEFAULT_DELIMITER,
): {
  serverName: string
  toolName: string
} {
  const regex = new RegExp(`^(.+?)${delimiter}(.+)$`)
  const match = name.match(regex)

  if (!match || match.length < 3) {
    throw new InvalidToolNameException(name)
  }

  const serverName = match[1]
  const toolName = match[2]

  if (!serverName || !toolName) {
    throw new InvalidToolNameException(name)
  }

  return { serverName, toolName }
}

/**
 * Creates a combined tool name from server name and tool name components
 * @param serverName Server name component
 * @param toolName Tool name component
 * @param delimiter Optional custom delimiter
 */
export function getToolName(
  serverName: string,
  toolName: string,
  delimiter: string = DEFAULT_DELIMITER,
): string {
  return `${serverName}${delimiter}${toolName}`
}
