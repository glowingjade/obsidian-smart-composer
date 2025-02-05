import { App, Modal, Setting } from 'obsidian'

export class ConfirmModal extends Modal {
  constructor(
    app: App,
    private title: string,
    private message: string,
    private onConfirm: () => void,
    private onCancel?: () => void,
  ) {
    super(app)
  }

  onOpen() {
    this.titleEl.setText(this.title)

    this.message.split('\n').forEach((line) => {
      this.contentEl.createEl('p', {
        text: line,
      })
    })

    new Setting(this.contentEl)
      .addButton((btn) =>
        btn.setButtonText('Cancel').onClick(() => {
          this.close()
          this.onCancel?.()
        }),
      )
      .addButton((btn) =>
        btn
          .setButtonText('Confirm')
          .setWarning()
          .onClick(() => {
            this.onConfirm()
            this.close()
          }),
      )
  }

  onClose() {
    const { contentEl } = this
    contentEl.empty()

    this.onCancel?.()
  }
}
