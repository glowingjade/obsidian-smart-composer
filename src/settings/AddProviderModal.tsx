import { App, Modal, Notice, Setting } from 'obsidian'

import { PROVIDER_TYPES_INFO } from '../constants'
import SmartCopilotPlugin from '../main'
import {
  LLMProvider,
  LLMProviderType,
  llmProviderSchema,
} from '../types/provider.types'

export class AddProviderModal extends Modal {
  private plugin: SmartCopilotPlugin
  private onSubmit: () => void
  private formData: LLMProvider = {
    type: 'openai-compatible',
    id: '',
    apiKey: '',
    baseUrl: '',
  }
  private settings: Map<keyof LLMProvider, Setting> = new Map()

  constructor(app: App, plugin: SmartCopilotPlugin, onSubmit: () => void) {
    super(app)
    this.plugin = plugin
    this.onSubmit = onSubmit
  }

  onOpen() {
    const { contentEl } = this
    contentEl.empty()

    this.titleEl.setText('Add Custom Provider')

    new Setting(contentEl)
      .setName('ID')
      .setDesc(
        'Choose an ID to identify this provider in your settings. This is just for your reference.',
      )
      .addText((text) =>
        text
          .setPlaceholder('my-custom-provider')
          .setValue(this.formData.id)
          .onChange((value) => {
            this.formData.id = value
          }),
      )
      .then((setting) => this.settings.set('id', setting))
      .then((setting) => setting.nameEl.addClass('smtcmp-settings-required'))

    new Setting(contentEl)
      .setName('Provider Type')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(
            Object.fromEntries(
              Object.entries(PROVIDER_TYPES_INFO).map(([key, value]) => [
                key,
                value.label,
              ]),
            ),
          )
          .setValue(this.formData.type)
          .onChange((value) => {
            this.formData.type = value as LLMProviderType
            this.update()
          }),
      )
      .then((setting) => this.settings.set('type', setting))
      .then((setting) => setting.nameEl.addClass('smtcmp-settings-required'))

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
          .setButtonText('Add')
          .setCta()
          .onClick(async () => {
            if (
              this.plugin.settings.providers.some(
                (p) => p.id === this.formData.id,
              )
            ) {
              new Notice(
                'Provider with this ID already exists. Try a different ID.',
              )
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
              providers: [...this.plugin.settings.providers, this.formData],
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
