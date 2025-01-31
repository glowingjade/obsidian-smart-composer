export class DuplicateTemplateException extends Error {
  constructor(templateName: string) {
    super(`Template with name "${templateName}" already exists`)
    this.name = 'DuplicateTemplateException'
  }
}
