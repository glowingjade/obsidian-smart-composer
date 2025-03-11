import { App, Modal, Setting } from 'obsidian'

export class ReportBugModal extends Modal {
  constructor(
    app: App,
    private title: string,
    private message: string,
    private log?: string,
  ) {
    super(app)
  }

  onOpen() {
    this.modalEl.style.minWidth = '60vw'

    this.titleEl.setText(this.title)

    const messageContainer = this.contentEl.createDiv()
    messageContainer.style.maxHeight = '50vh'
    messageContainer.style.display = 'flex'
    messageContainer.style.flexDirection = 'column'

    const messageEl = messageContainer.createDiv()
    messageEl.style.whiteSpace = 'pre-line'
    messageEl.setText(this.message)

    if (this.log) {
      const logEl = messageContainer.createEl('pre')
      logEl.style.whiteSpace = 'pre-wrap'
      logEl.style.wordBreak = 'break-word'
      logEl.style.marginTop = '1rem'
      logEl.style.flexGrow = '1'
      logEl.style.overflowY = 'auto'
      logEl.style.userSelect = 'text'
      logEl.style.cursor = 'text'
      logEl.setText(this.log)
    }

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
