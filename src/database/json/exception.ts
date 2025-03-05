export class DuplicateTemplateException extends Error {
  constructor(templateName: string) {
    super(`Template with name "${templateName}" already exists`)
    this.name = 'DuplicateTemplateException'
  }
}

export class EmptyChatTitleException extends Error {
  constructor() {
    super('Chat title cannot be empty')
    this.name = 'EmptyChatTitleException'
  }
}
