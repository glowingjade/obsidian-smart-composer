import { App, Modal, Setting } from 'obsidian'

export class ConversationPromptModal extends Modal {
  private conversationId: string = ''
  private onSubmit: (result: string | null) => void

  constructor(app: App, onSubmit: (result: string | null) => void) {
    super(app)
    this.onSubmit = onSubmit
  }

  onOpen() {
    const { contentEl } = this
    
    contentEl.createEl('h2', { text: 'Enter Conversation ID' })
    
    new Setting(contentEl)
      .setName('Conversation ID')
      .setDesc('Enter the ID of the conversation you want to open')
      .addText((text) => {
        text.setValue(this.conversationId)
          .onChange((value) => {
            this.conversationId = value
          })
          .inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              this.close()
              this.onSubmit(this.conversationId)
            }
          })
        
        // Focus the input field
        setTimeout(() => {
          text.inputEl.focus()
        }, 10)
      })
    
    new Setting(contentEl)
      .addButton((btn) => {
        btn.setButtonText('Open')
          .setCta()
          .onClick(() => {
            this.close()
            this.onSubmit(this.conversationId)
          })
      })
      .addButton((btn) => {
        btn.setButtonText('Cancel')
          .onClick(() => {
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