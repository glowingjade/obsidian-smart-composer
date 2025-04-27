import { App, Modal, Setting } from 'obsidian'

export type ConfirmModalOptions = {
  title: string
  message: string
  ctaText?: string
  onConfirm: () => void
  onCancel?: () => void
}

export class ConfirmModal extends Modal {
  private title: string
  private message: string
  private ctaText: string
  private onConfirm: () => void
  private onCancel?: () => void

  constructor(app: App, options: ConfirmModalOptions) {
    super(app)
    this.title = options.title
    this.message = options.message
    this.ctaText = options.ctaText ?? 'Confirm'
    this.onConfirm = options.onConfirm
    this.onCancel = options.onCancel
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
          .setButtonText(this.ctaText)
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
