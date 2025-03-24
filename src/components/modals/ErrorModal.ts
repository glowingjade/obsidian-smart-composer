import { App, Modal, Setting } from 'obsidian'

type ErrorModalConfig = {
  showCloseButton?: boolean
  showReportBugButton?: boolean
  showSettingsButton?: boolean
}

export class ErrorModal extends Modal {
  constructor(
    app: App,
    protected title: string,
    protected message: string,
    protected log?: string,
    protected config: ErrorModalConfig = {},
  ) {
    super(app)
  }

  onOpen() {
    this.modalEl.addClass('error-modal')
    this.titleEl.setText(this.title)

    const messageContainer = this.contentEl.createDiv(
      'smtcmp-error-modal-content',
    )
    const messageEl = messageContainer.createDiv('smtcmp-error-modal-message')
    messageEl.setText(this.message)

    if (this.log) {
      const logEl = messageContainer.createEl('pre', 'smtcmp-error-modal-log')
      logEl.setText(this.log)
    }

    const buttonContainer = this.contentEl.createDiv(
      'smtcmp-error-modal-buttons',
    )
    const setting = new Setting(buttonContainer)

    if (this.config.showCloseButton !== false) {
      setting.addButton((btn) =>
        btn.setButtonText('Close').onClick(() => {
          this.close()
        }),
      )
    }

    if (this.config.showReportBugButton) {
      setting.addButton((btn) =>
        btn
          .setButtonText('Report Bug')
          .setCta()
          .onClick(() => {
            this.close()
            window.open(
              'https://github.com/glowingjade/obsidian-smart-composer/issues',
              '_blank',
            )
          }),
      )
    }

    if (this.config.showSettingsButton) {
      setting.addButton((btn) =>
        btn
          .setButtonText('Open Settings')
          .setCta()
          .onClick(() => {
            this.close()
            // @ts-expect-error: setting property exists in Obsidian's App but is not typed
            this.app.setting.open()
            // @ts-expect-error: setting property exists in Obsidian's App but is not typed
            this.app.setting.openTabById('smart-composer')
          }),
      )
    }
  }

  onClose() {
    const { contentEl } = this
    contentEl.empty()
  }
}
