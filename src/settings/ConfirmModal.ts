import { App, Modal, Setting } from 'obsidian'

export class ConfirmModal extends Modal {
  constructor(
    app: App,
    private title: string,
    private message: string,
    private onConfirm: () => void,
  ) {
    super(app)
  }

  onOpen() {
    this.titleEl.setText(this.title)

    this.contentEl.createEl('p', {
      text: this.message,
    })

    new Setting(this.contentEl)
      .addButton((btn) =>
        btn.setButtonText('Cancel').onClick(() => {
          this.close()
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
}
