/**
 * Migrates templates from PGlite database to JSON storage.
 *
 * TODO: Drop template table and remove this template functionality
 * once all users have migrated to the new JSON-based system
 */

import { App } from 'obsidian'

import SmartCopilotPlugin from '../../../main'
import { DuplicateTemplateException } from '../exception'
import { TemplateManager as JsonTemplateManager } from '../models/template'

import { Migration } from './types'

export const m0001_InitTemplateDb: Migration = {
  id: '0001_init_template_db',
  description: 'Initializes the template database',
  up: ({ app, plugin }: { app: App; plugin: SmartCopilotPlugin }) =>
    initTemplateDb(app, plugin),
}

async function initTemplateDb(
  app: App,
  plugin: SmartCopilotPlugin,
): Promise<void> {
  const jsonTemplateManager = new JsonTemplateManager(app)
  const drizzleTemplateManager = (
    await plugin.getDbManager()
  ).getTemplateManager()
  const templates = await drizzleTemplateManager.findAllTemplates()
  for (const template of templates) {
    try {
      await jsonTemplateManager.createTemplate({
        name: template.name,
        content: template.content,
      })
    } catch (error) {
      if (error instanceof DuplicateTemplateException) {
        console.log(`Duplicate template found: ${template.name}. Skipping...`)
      } else {
        throw error
      }
    }
  }
}
