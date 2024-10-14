export class LLMAPIKeyNotSetException extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LLMAPIKeyNotSetException'
  }
}

export class LLMAPIKeyInvalidException extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LLMAPIKeyInvalidException'
  }
}
