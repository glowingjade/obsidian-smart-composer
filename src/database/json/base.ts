import * as path from 'path'

import { App, normalizePath } from 'obsidian'

export abstract class AbstractJsonRepository<T, M> {
  protected dataDir: string
  protected app: App

  constructor(app: App, dataDir: string) {
    this.app = app
    this.dataDir = normalizePath(dataDir)
    this.ensureDirectory()
  }

  private async ensureDirectory(): Promise<void> {
    if (!(await this.app.vault.adapter.exists(this.dataDir))) {
      await this.app.vault.adapter.mkdir(this.dataDir)
    }
  }

  // Each subclass implements how to generate a file name from a data row.
  protected abstract generateFileName(row: T): string

  // Each subclass implements how to parse a file name into metadata.
  protected abstract parseFileName(fileName: string): M | null

  public async create(row: T): Promise<void> {
    const fileName = this.generateFileName(row)
    const filePath = normalizePath(path.join(this.dataDir, fileName))
    const content = JSON.stringify(row, null, 2)

    if (await this.app.vault.adapter.exists(filePath)) {
      throw new Error(`File already exists: ${filePath}`)
    }

    await this.app.vault.adapter.write(filePath, content)
  }

  public async update(oldRow: T, newRow: T): Promise<void> {
    const oldFileName = this.generateFileName(oldRow)
    const newFileName = this.generateFileName(newRow)
    const content = JSON.stringify(newRow, null, 2)

    if (oldFileName === newFileName) {
      // Simple update - filename hasn't changed
      const filePath = normalizePath(path.join(this.dataDir, oldFileName))
      await this.app.vault.adapter.write(filePath, content)
    } else {
      // Filename has changed - create new file and delete old one
      const newFilePath = normalizePath(path.join(this.dataDir, newFileName))
      await this.app.vault.adapter.write(newFilePath, content)
      await this.delete(oldFileName)
    }
  }

  // List metadata for all records by parsing file names.
  public async listMetadata(): Promise<(M & { fileName: string })[]> {
    const files = await this.app.vault.adapter.list(this.dataDir)
    return files.files
      .map((filePath) => path.basename(filePath))
      .filter((fileName) => fileName.endsWith('.json'))
      .map((fileName) => {
        const metadata = this.parseFileName(fileName)
        return metadata ? { ...metadata, fileName } : null
      })
      .filter(
        (metadata): metadata is M & { fileName: string } => metadata !== null,
      )
  }

  public async read(fileName: string): Promise<T | null> {
    const filePath = normalizePath(path.join(this.dataDir, fileName))
    if (!(await this.app.vault.adapter.exists(filePath))) return null

    const content = await this.app.vault.adapter.read(filePath)
    return JSON.parse(content) as T
  }

  public async delete(fileName: string): Promise<void> {
    const filePath = normalizePath(path.join(this.dataDir, fileName))
    if (await this.app.vault.adapter.exists(filePath)) {
      await this.app.vault.adapter.remove(filePath)
    }
  }
}
