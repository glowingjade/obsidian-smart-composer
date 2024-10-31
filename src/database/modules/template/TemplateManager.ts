import fuzzysort from 'fuzzysort'
import { App } from 'obsidian'

import { DatabaseManager } from '../../DatabaseManager'
import { DuplicateTemplateException } from '../../exception'
import { InsertTemplate, SelectTemplate } from '../../schema'

import { TemplateRepository } from './TemplateRepository'

export class TemplateManager {
  private app: App
  private repository: TemplateRepository
  private dbManager: DatabaseManager

  constructor(app: App, dbManager: DatabaseManager) {
    this.app = app
    this.dbManager = dbManager
    this.repository = new TemplateRepository(app, dbManager.getDb())
  }

  async createTemplate(template: InsertTemplate): Promise<SelectTemplate> {
    const existingTemplate = await this.repository.findByName(template.name)
    if (existingTemplate) {
      throw new DuplicateTemplateException(template.name)
    }
    const created = await this.repository.create(template)
    await this.dbManager.save()
    return created
  }

  async findAllTemplates(): Promise<SelectTemplate[]> {
    return await this.repository.findAll()
  }

  async searchTemplates(query: string): Promise<SelectTemplate[]> {
    const templates = await this.findAllTemplates()
    const results = fuzzysort.go(query, templates, {
      keys: ['name'],
      threshold: 0.2,
      limit: 20,
      all: true,
    })
    return results.map((result) => result.obj)
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const deleted = await this.repository.delete(id)
    await this.dbManager.save()
    return deleted
  }
}
