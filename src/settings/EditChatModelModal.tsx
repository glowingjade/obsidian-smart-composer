import { App, Modal, Notice, Setting } from 'obsidian'

import SmartCopilotPlugin from '../main'
import { ChatModel, chatModelSchema } from '../types/chat-model.types'

export class EditChatModelModal extends Modal {
  private plugin: SmartCopilotPlugin
  private onSubmit: () => void
  private formData: ChatModel
  private settings: Map<keyof ChatModel, Setting> = new Map()

  constructor(
    app: App,
    plugin: SmartCopilotPlugin,
    chatModel: ChatModel,
    onSubmit: () => void,
  ) {
    super(app)
    this.plugin = plugin
    this.formData = {
      ...chatModel,
    }
    this.onSubmit = onSubmit
  }

  onOpen() {
    const { contentEl } = this
    contentEl.empty()

    this.titleEl.setText(`Edit Chat Model: ${this.formData.id}`)

    new Setting(contentEl)
      .setName('Model Name')
      .addText((text) =>
        text
          .setPlaceholder('Enter the model name')
          .setValue(this.formData.model)
          .onChange((value) => {
            this.formData.model = value
          }),
      )
      .then((setting) => this.settings.set('model', setting))
      .then((setting) => setting.nameEl.addClass('smtcmp-settings-required'))

    new Setting(contentEl)
      .addButton((button) =>
        button
          .setButtonText('Save')
          .setCta()
          .onClick(async () => {
            const validationResult = chatModelSchema.safeParse(this.formData)

            if (!validationResult.success) {
              new Notice(
                validationResult.error.issues.map((v) => v.message).join('\n'),
              )
              return
            }

            const newChatModels = [...this.plugin.settings.chatModels]
            const currentModelIndex = newChatModels.findIndex(
              (v) => v.id === this.formData.id,
            )

            if (currentModelIndex === -1) {
              new Notice(`No chat model found with ID ${this.formData.id}`)
              return
            }

            await this.plugin.setSettings({
              ...this.plugin.settings,
              chatModels: [
                ...newChatModels.slice(0, currentModelIndex),
                this.formData,
                ...newChatModels.slice(currentModelIndex + 1),
              ],
            })

            this.close()
            this.onSubmit()
          }),
      )
      .addButton((button) =>
        button.setButtonText('Cancel').onClick(() => this.close()),
      )
  }

  onClose() {
    const { contentEl } = this
    contentEl.empty()
  }
}
