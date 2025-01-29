import { App, Modal, TFile } from 'obsidian'

export class ExcludedFilesModal extends Modal {
  private files: TFile[]

  constructor(app: App, files: TFile[]) {
    super(app)
    this.files = files
  }

  onOpen() {
    const { contentEl } = this
    contentEl.empty()

    this.titleEl.setText(`Excluded Files (${this.files.length})`)

    if (this.files.length === 0) {
      contentEl.createEl('p', { text: 'No files match the exclusion patterns' })
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
