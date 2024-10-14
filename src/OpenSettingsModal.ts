import { App, Modal, Setting } from 'obsidian'

export class OpenSettingsModal extends Modal {
  constructor(app: App, title: string, onSubmit: () => void) {
    super(app)

    this.setTitle(title)

    new Setting(this.contentEl).addButton((button) => {
      button.setButtonText('Open Settings')
      button.onClick(() => {
        this.close()
        onSubmit()
      })
    })
  }
}
