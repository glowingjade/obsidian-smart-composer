export class InvalidToolNameException extends Error {
  constructor(name: string) {
    super(`Invalid tool name: ${name}`)
    this.name = 'InvalidToolNameException'
  }
}
