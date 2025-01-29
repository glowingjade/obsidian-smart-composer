import { App, Modal, TFile } from 'obsidian'

export class IncludedFilesModal extends Modal {
  private files: TFile[]
  private patterns: string[]

  constructor(app: App, files: TFile[], patterns: string[]) {
    super(app)
    this.files = files
    this.patterns = patterns
  }

  onOpen() {
    const { contentEl } = this
    contentEl.empty()

    this.titleEl.setText(`Included Files (${this.files.length})`)

    if (this.patterns.length === 0) {
      contentEl.createEl('p', {
        text: 'No inclusion patterns specified - all files will be included (except those matching exclusion patterns)',
      })
      return
    }

    if (this.files.length === 0) {
      contentEl.createEl('p', {
        text: 'No files match the inclusion patterns',
      })
      return
    }

    const list = contentEl.createEl('ul')
    this.files.forEach((file) => {
      list.createEl('li', { text: file.path })
    })
  }

  onClose() {
    const { contentEl } = this
    contentEl.empty()
  }
}
