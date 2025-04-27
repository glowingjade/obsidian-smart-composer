export class McpNotAvailableException extends Error {
  constructor() {
    super('MCP is not available on mobile')
    this.name = 'McpNotAvailableException'
  }
}
export class InvalidToolNameException extends Error {
  constructor(name: string) {
    super(`Invalid tool name: ${name}`)
    this.name = 'InvalidToolNameException'
  }
}
