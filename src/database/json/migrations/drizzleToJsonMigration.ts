import { App } from 'obsidian'

import { DatabaseManager } from '../../DatabaseManager'
import { DuplicateTemplateException } from '../exception'
import { TemplateManager } from '../template/TemplateManager'

export async function migrateTemplatesFromDrizzleToJson(
  app: App,
  dbManager: DatabaseManager,
): Promise<void> {
  const jsonTemplateManager = new TemplateManager(app)
  const drizzleTemplateManager = dbManager.getTemplateManager()
  const templates = await drizzleTemplateManager.findAllTemplates()
  for (const template of templates) {
    try {
      await jsonTemplateManager.createTemplate({
        name: template.name,
        content: template.content,
      })
      await drizzleTemplateManager.deleteTemplate(template.id)
    } catch (error) {
      if (error instanceof DuplicateTemplateException) {
        console.log(`Duplicate template found: ${template.name}. Skipping...`)
      } else {
        throw error
      }
    }
  }
}
