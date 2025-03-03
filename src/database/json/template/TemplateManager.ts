import fuzzysort from 'fuzzysort'
import { App } from 'obsidian'
import { v4 as uuidv4 } from 'uuid'

import { AbstractJsonTable } from '../base'
import { ROOT_DIR, TEMPLATE_DIR } from '../constants'

import { TEMPLATE_SCHEMA_VERSION, Template, TemplateMetadata } from './types'

export class TemplateManager extends AbstractJsonTable<
  Template,
  TemplateMetadata
> {
  constructor(app: App) {
    super(app, `${ROOT_DIR}/${TEMPLATE_DIR}`)
  }

  protected generateFileName(template: Template): string {
    // Format: v{schemaVersion}_name_id.json (with name encoded)
    const encodedName = encodeURIComponent(template.name)
    return `v${TEMPLATE_SCHEMA_VERSION}_${encodedName}_${template.id}.json`
  }

  protected parseFileName(fileName: string): TemplateMetadata | null {
    const match = fileName.match(/^v(\d+)_(.+)_([^_]+)\.json$/)
    if (!match) return null

    const schemaVersion = parseInt(match[1], 10)
    const encodedName = match[2]
    const id = match[3]
    const name = decodeURIComponent(encodedName)

    return { id, name, schemaVersion }
  }

  public async createTemplate(
    template: Omit<
      Template,
      'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'
    >,
  ): Promise<Template> {
    const now = new Date()
    const newTemplate: Template = {
      id: uuidv4(),
      ...template,
      createdAt: now,
      updatedAt: now,
      schemaVersion: TEMPLATE_SCHEMA_VERSION,
    }

    await this.create(newTemplate)
    return newTemplate
  }

  public async findById(id: string): Promise<Template | null> {
    const allMetadata = await this.listMetadata()
    const targetMetadata = allMetadata.find((meta) => meta.id === id)

    if (!targetMetadata) return null

    return this.read(targetMetadata.fileName)
  }

  public async findByName(name: string): Promise<Template | null> {
    const allMetadata = await this.listMetadata()
    const targetMetadata = allMetadata.find((meta) => meta.name === name)

    if (!targetMetadata) return null

    return this.read(targetMetadata.fileName)
  }

  public async updateTemplate(
    id: string,
    updates: Partial<
      Omit<Template, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'>
    >,
  ): Promise<Template | null> {
    const template = await this.findById(id)
    if (!template) return null

    const updatedTemplate: Template = {
      ...template,
      ...updates,
      updatedAt: new Date(),
    }

    await this.update(template, updatedTemplate)
    return updatedTemplate
  }

  public async deleteTemplate(id: string): Promise<boolean> {
    const template = await this.findById(id)
    if (!template) return false

    const fileName = this.generateFileName(template)
    await this.delete(fileName)
    return true
  }

  public async searchTemplates(query: string): Promise<Template[]> {
    const allMetadata = await this.listMetadata()
    const results = fuzzysort.go(query, allMetadata, {
      keys: ['name'],
      threshold: 0.2,
      limit: 20,
      all: true,
    })

    const templates = (
      await Promise.all(
        results.map(async (result) => this.read(result.obj.fileName)),
      )
    ).filter((template): template is Template => template !== null)

    return templates
  }
}
