import fuzzysort from 'fuzzysort'
import { App } from 'obsidian'

import { TEMPLATE } from '../constants'
import { DuplicateTemplateException } from '../exception'
import { TemplateDocument, TemplateIndex } from '../schemas/template'

import { IndexedFileStorage } from './indexedFileStorage'

export class TemplateManager extends IndexedFileStorage<
  TemplateDocument,
  TemplateIndex
> {
  constructor(app: App) {
    super(app, {
      rootPath: TEMPLATE.ROOT_DIR,
      indexFileName: TEMPLATE.INDEX_FILE,
      documentsDirName: TEMPLATE.DOCUMENTS_DIR,
      currentSchemaVersion: TEMPLATE.SCHEMA_VERSION,
    })
  }

  async createTemplate({
    name,
    content,
  }: {
    name: TemplateDocument['name']
    content: TemplateDocument['content']
  }): Promise<TemplateDocument> {
    // check if template with same name already exists
    const templateIndexList = await this.getIndex()
    if (templateIndexList.some((index) => index.name === name)) {
      throw new DuplicateTemplateException(name)
    }
    const created = await this.createDocument({ name, content })
    return created
  }

  async searchTemplates(query: string): Promise<TemplateDocument[]> {
    // const templateIndexList = await this.getIndex()
    const templates = await this.findAllDocuments()
    const results = fuzzysort.go(query, templates, {
      keys: ['name'],
      threshold: 0.2,
      limit: 20,
      all: true,
    })
    return results.map((result) => result.obj)
  }

  protected createIndexEntry(
    templateDocument: TemplateDocument,
  ): TemplateIndex {
    return {
      name: templateDocument.name,
      id: templateDocument.id,
      schemaVersion: templateDocument.schemaVersion,
      createdAt: templateDocument.createdAt,
      updatedAt: templateDocument.updatedAt,
    }
  }
}
