import { App, Modal, Notice, Setting } from 'obsidian'

import { DEFAULT_PROVIDERS } from '../constants'
import SmartCopilotPlugin from '../main'
import { ChatModel, chatModelSchema } from '../types/chat-model.types'

export class AddChatModelModal extends Modal {
  private plugin: SmartCopilotPlugin
  private onSubmit: () => void
  private formData: ChatModel = {
    providerId: DEFAULT_PROVIDERS[0].id,
    providerType: DEFAULT_PROVIDERS[0].type,
    id: '',
    model: '',
  }
  private settings: Map<keyof ChatModel, Setting> = new Map()

  constructor(app: App, plugin: SmartCopilotPlugin, onSubmit: () => void) {
    super(app)
    this.plugin = plugin
    this.onSubmit = onSubmit
  }

  onOpen() {
    const { contentEl } = this
    contentEl.empty()

    this.titleEl.setText('Add Custom Chat Model')

    new Setting(contentEl)
      .setName('ID')
      .setDesc(
        'Choose an ID to identify this model in your settings. This is just for your reference.',
      )
      .addText((text) =>
        text
          .setPlaceholder('my-custom-model')
          .setValue(this.formData.id)
          .onChange((value) => {
            this.formData.id = value
          }),
      )
      .then((setting) => this.settings.set('id', setting))
      .then((setting) => setting.nameEl.addClass('smtcmp-settings-required'))

    new Setting(contentEl)
      .setName('Provider ID')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(
            Object.fromEntries(
              this.plugin.settings.providers.map((provider) => [
                provider.id,
                provider.id,
              ]),
            ),
          )
          .setValue(this.formData.providerId)
          .onChange((value) => {
            const provider = this.plugin.settings.providers.find(
              (p) => p.id === value,
            )
            if (!provider) {
              new Notice(`Provider with ID ${value} not found`)
              return
            }
            this.formData.providerId = value
            this.formData.providerType = provider.type
          }),
      )
      .then((setting) => this.settings.set('providerId', setting))
      .then((setting) => setting.nameEl.addClass('smtcmp-settings-required'))

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
          .setButtonText('Add')
          .setCta()
          .onClick(async () => {
            if (
              this.plugin.settings.chatModels.some(
                (p) => p.id === this.formData.id,
              )
            ) {
              new Notice(
                'Model with this ID already exists. Try a different ID.',
              )
              return
            }

            if (
              !this.plugin.settings.providers.some(
                (provider) => provider.id === this.formData.providerId,
              )
            ) {
              new Notice('Provider with this ID does not exist')
              return
            }

            const validationResult = chatModelSchema.safeParse(this.formData)

            if (!validationResult.success) {
              new Notice(
                validationResult.error.issues.map((v) => v.message).join('\n'),
              )
              return
            }

            await this.plugin.setSettings({
              ...this.plugin.settings,
              chatModels: [...this.plugin.settings.chatModels, this.formData],
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
