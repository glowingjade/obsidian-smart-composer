import { App, normalizePath } from 'obsidian'

import { DB_ROOT } from '../constants'

export type BaseDocument = {
  id: string
  schemaVersion: number
  createdAt: number
  updatedAt: number
}

export type IndexedStorageConfig = {
  rootPath: string
  indexFileName: string
  documentsDirName: string
  currentSchemaVersion: number
}

export class IndexedFileStorage<
  TDocument extends BaseDocument,
  TIndex extends BaseDocument,
> {
  private app: App
  private config: IndexedStorageConfig

  constructor(app: App, config: IndexedStorageConfig) {
    this.app = app
    this.config = config
  }

  async createDocument(
    id: string,
    documentData: Partial<TDocument>,
  ): Promise<TDocument> {
    const newDocument = {
      schemaVersion: this.config.currentSchemaVersion,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...documentData,
    } as TDocument

    await this.saveDocument(newDocument)
    return newDocument
  }

  async deleteDocument(id: string): Promise<void> {
    const documentPath = this.getDocumentPath(id)
    if (await this.app.vault.adapter.exists(documentPath)) {
      await this.app.vault.adapter.remove(documentPath)
    }
    const indexEntries = await this.getIndex()
    const updatedIndexEntries = indexEntries.filter((entry) => entry.id !== id)
    await this.app.vault.adapter.write(
      this.getIndexPath(),
      JSON.stringify(updatedIndexEntries),
    )
  }

  async findDocument(id: string): Promise<TDocument | null> {
    const documentPath = this.getDocumentPath(id)
    if (await this.app.vault.adapter.exists(documentPath)) {
      const fileContent = await this.app.vault.adapter.read(documentPath)
      try {
        return JSON.parse(fileContent) as TDocument
      } catch (parseError) {
        console.error(`Error parsing document ${id}:`, parseError)
        return null
      }
    }

    // If document doesn't exist in filesystem, clean up the index
    const indexEntries = await this.getIndex()
    const hasIndexEntry = indexEntries.some((entry) => entry.id === id)
    if (hasIndexEntry) {
      const updatedIndexEntries = indexEntries.filter(
        (entry) => entry.id !== id,
      )
      await this.app.vault.adapter.write(
        this.getIndexPath(),
        JSON.stringify(updatedIndexEntries),
      )
    }
    return null
  }

  async saveDocument(document: TDocument): Promise<void> {
    await this.ensureDirectories()
    const documentPath = this.getDocumentPath(document.id)
    await this.app.vault.adapter.write(documentPath, JSON.stringify(document))
    await this.updateIndex(document)
  }

  async getIndex(): Promise<TIndex[]> {
    const indexPath = this.getIndexPath()
    if (await this.app.vault.adapter.exists(indexPath)) {
      const fileContent = await this.app.vault.adapter.read(indexPath)
      const indexEntries = JSON.parse(fileContent) as TIndex[]
      return indexEntries.filter(
        (entry) => entry.schemaVersion === this.config.currentSchemaVersion,
      )
    }
    return []
  }

  private async ensureDirectories() {
    const dbPath = this.getDbPath()
    const rootPath = this.getRootPath()
    const documentsPath = this.getDocumentsPath()

    if (!(await this.app.vault.adapter.exists(dbPath))) {
      await this.app.vault.createFolder(dbPath)
    }
    if (!(await this.app.vault.adapter.exists(rootPath))) {
      await this.app.vault.createFolder(rootPath)
    }
    if (!(await this.app.vault.adapter.exists(documentsPath))) {
      await this.app.vault.createFolder(documentsPath)
    }
  }

  protected async updateIndex(document: TDocument): Promise<void> {
    const indexEntries = await this.getIndex()
    const indexEntry = this.createIndexEntry(document)
    const existingEntryIndex = indexEntries.findIndex(
      (entry) => entry.id === document.id,
    )

    if (existingEntryIndex !== -1) {
      indexEntries[existingEntryIndex] = indexEntry
    } else {
      indexEntries.push(indexEntry)
    }

    indexEntries.sort((a, b) => b.updatedAt - a.updatedAt)
    await this.app.vault.adapter.write(
      this.getIndexPath(),
      JSON.stringify(indexEntries),
    )
  }

  protected createIndexEntry(document: TDocument): TIndex {
    return {
      schemaVersion: document.schemaVersion,
      id: document.id,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    } as TIndex
  }

  private getDbPath(): string {
    return normalizePath(DB_ROOT)
  }

  private getRootPath(): string {
    return normalizePath(`${DB_ROOT}/${this.config.rootPath}`)
  }

  private getIndexPath(): string {
    return normalizePath(
      `${DB_ROOT}/${this.config.rootPath}/${this.config.indexFileName}`,
    )
  }

  private getDocumentsPath(): string {
    return normalizePath(
      `${DB_ROOT}/${this.config.rootPath}/${this.config.documentsDirName}`,
    )
  }

  private getDocumentPath(id: string): string {
    return normalizePath(`${this.getDocumentsPath()}/${id}.json`)
  }
}
