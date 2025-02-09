import { App, Modal, Setting } from 'obsidian'

export class ReportBugModal extends Modal {
  constructor(
    app: App,
    private title: string,
    private message: string,
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
        btn.setButtonText('Close').onClick(() => {
          this.close()
        }),
      )
      .addButton((btn) =>
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

  onClose() {
    const { contentEl } = this
    contentEl.empty()
  }
}
