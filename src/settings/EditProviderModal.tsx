import { App, Modal, Notice, Setting } from 'obsidian'

import { PROVIDER_TYPES_INFO } from '../constants'
import SmartCopilotPlugin from '../main'
import { LLMProvider, llmProviderSchema } from '../types/provider.types'

export class EditProviderModal extends Modal {
  private plugin: SmartCopilotPlugin
  private onSubmit: () => void
  private formData: LLMProvider
  private settings: Map<keyof LLMProvider, Setting> = new Map()

  constructor(
    app: App,
    plugin: SmartCopilotPlugin,
    provider: LLMProvider,
    onSubmit: () => void,
  ) {
    super(app)
    this.plugin = plugin
    this.formData = {
      ...provider,
    }
    this.onSubmit = onSubmit
  }

  onOpen() {
    const { contentEl } = this
    contentEl.empty()

    this.titleEl.setText(`Edit provider: ${this.formData.id}`)

    new Setting(contentEl)
      .setName('API Key')
      .setDesc('(leave blank if not required)')
      .addText((text) =>
        text
          .setPlaceholder('Enter your API Key')
          .setValue(this.formData.apiKey ?? '')
          .onChange((value) => {
            this.formData.apiKey = value
          }),
      )
      .then((setting) => this.settings.set('apiKey', setting))

    new Setting(contentEl)
      .setName('Base URL')
      .setDesc('(leave blank if using default)')
      .addText((text) =>
        text
          .setPlaceholder('Enter base URL')
          .setValue(this.formData.baseUrl ?? '')
          .onChange((value) => {
            this.formData.baseUrl = value
          }),
      )
      .then((setting) => this.settings.set('baseUrl', setting))

    new Setting(contentEl)
      .addButton((button) =>
        button
          .setButtonText('Save')
          .setCta()
          .onClick(async () => {
            const newProviders = [...this.plugin.settings.providers]
            const currentProviderIndex = newProviders.findIndex(
              (v) => v.id === this.formData.id,
            )

            if (currentProviderIndex === -1) {
              new Notice(`No provider found with this ID`)
              return
            }

            const validationResult = llmProviderSchema.safeParse(this.formData)

            if (!validationResult.success) {
              new Notice(
                validationResult.error.issues.map((v) => v.message).join('\n'),
              )
              return
            }

            await this.plugin.setSettings({
              ...this.plugin.settings,
              providers: [
                ...this.plugin.settings.providers.slice(
                  0,
                  currentProviderIndex,
                ),
                this.formData,
                ...this.plugin.settings.providers.slice(
                  currentProviderIndex + 1,
                ),
              ],
            })

            this.close()
            this.onSubmit()
          }),
      )
      .addButton((button) =>
        button.setButtonText('Cancel').onClick(() => this.close()),
      )

    this.update()
  }

  onClose() {
    const { contentEl } = this
    contentEl.empty()
  }

  private update() {
    if (PROVIDER_TYPES_INFO[this.formData.type].requireBaseUrl) {
      this.settings.get('baseUrl')?.nameEl.addClass('smtcmp-settings-required')
    } else {
      this.settings
        .get('baseUrl')
        ?.nameEl.removeClass('smtcmp-settings-required')
    }
  }
}
