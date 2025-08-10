export class LLMAPIKeyNotSetException extends Error {
  constructor(
    message: string,
    public rawError?: Error,
  ) {
    super(message)
    this.name = 'LLMAPIKeyNotSetException'
  }
}

export class LLMAPIKeyInvalidException extends Error {
  constructor(
    message: string,
    public rawError?: Error,
  ) {
    super(message)
    this.name = 'LLMAPIKeyInvalidException'
  }
}

export class LLMBaseUrlNotSetException extends Error {
  constructor(
    message: string,
    public rawError?: Error,
  ) {
    super(message)
    this.name = 'LLMBaseUrlNotSetException'
  }
}

export class LLMRateLimitExceededException extends Error {
  constructor(
    message: string,
    public rawError?: Error,
  ) {
    super(message)
    this.name = 'LLMRateLimitExceededException'
  }
}

export class LLMModelNotFoundException extends Error {
  constructor(
    message: string,
    public rawError?: Error,
  ) {
    super(message)
    this.name = 'LLMModelNotFoundException'
  }
}
