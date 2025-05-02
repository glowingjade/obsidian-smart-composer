import { App, Modal, Notice, Setting, SuggestModal, TFile } from 'obsidian'

class FileSuggestModal extends SuggestModal<TFile> {
  private onSelect: (file: TFile) => void
  private files: TFile[] = []

  constructor(app: App, onSelect: (file: TFile) => void) {
    super(app)
    this.onSelect = onSelect

    // Get all markdown files from the vault
    this.files = this.app.vault.getMarkdownFiles()
  }

  getSuggestions(query: string): TFile[] {
    if (!query) return this.files

    const lowerCaseQuery = query.toLowerCase()
    return this.files
      .filter((file) => file.path.toLowerCase().includes(lowerCaseQuery))
      .sort((a, b) => {
        // Prioritize files that start with the query
        const aStartsWith = a.path.toLowerCase().startsWith(lowerCaseQuery)
          ? 0
          : 1
        const bStartsWith = b.path.toLowerCase().startsWith(lowerCaseQuery)
          ? 0
          : 1
        if (aStartsWith !== bStartsWith) return aStartsWith - bStartsWith

        // Then sort alphabetically
        return a.path.localeCompare(b.path)
      })
  }

  renderSuggestion(file: TFile, el: HTMLElement) {
    el.createEl('div', { text: file.path })
  }

  onChooseSuggestion(file: TFile, _evt: MouseEvent | KeyboardEvent) {
    this.onSelect(file)
  }
}

export class CreateChatModal extends Modal {
  private message = ''
  private selectedFile: TFile | null = null
  private onSubmit: (
    result: { message: string; file?: TFile | null } | null,
  ) => void

  constructor(
    app: App,
    onSubmit: (result: { message: string; file?: TFile | null } | null) => void,
  ) {
    super(app)
    this.onSubmit = onSubmit
  }

  onOpen() {
    const { contentEl } = this

    contentEl.createEl('h2', { text: 'Create New Chat' })

    new Setting(contentEl)
      .setName('Initial Message')
      .setDesc('Enter the message to start the chat with')
      .addTextArea((text) => {
        text.setValue(this.message).onChange((value) => {
          this.message = value
        })

        // Set height and placeholder
        text.inputEl.style.height = '100px'
        text.inputEl.style.width = '100%'
        text.inputEl.setAttribute('placeholder', 'Enter your message here...')

        // Focus the input field
        setTimeout(() => {
          text.inputEl.focus()
        }, 10)
      })

    const fileSelector = new Setting(contentEl)
      .setName('Selected Document')
      .setDesc('Choose a document to attach (optional)')

    const fileDisplay = contentEl.createEl('div', {
      cls: 'selected-file',
    })

    if (this.selectedFile) {
      fileDisplay.setText(this.selectedFile.path)
    } else {
      fileDisplay.setText('No file selected')
    }

    fileSelector.addButton((button) => {
      button.setButtonText('Choose File').onClick(() => {
        new FileSuggestModal(this.app, (file) => {
          this.selectedFile = file
          fileDisplay.setText(file.path)
        }).open()
      })
    })

    new Setting(contentEl)
      .addButton((btn) => {
        btn
          .setButtonText('Create Chat')
          .setCta()
          .onClick(() => {
            if (!this.message) {
              new Notice('Please enter a message')
              return
            }

            this.close()
            this.onSubmit({
              message: this.message,
              file: this.selectedFile ?? undefined,
            })
          })
      })
      .addButton((btn) => {
        btn.setButtonText('Cancel').onClick(() => {
          this.close()
          this.onSubmit(null)
        })
      })
  }

  onClose() {
    const { contentEl } = this
    contentEl.empty()
  }
}
