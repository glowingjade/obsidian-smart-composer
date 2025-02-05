import { App, Modal, Notice, Setting } from 'obsidian'

import { DEFAULT_PROVIDERS, PROVIDER_TYPES_INFO } from '../constants'
import { getProviderClient } from '../core/llm/manager'
import { supportedDimensionsForIndex } from '../database/schema'
import SmartComposerPlugin from '../main'
import {
  EmbeddingModel,
  embeddingModelSchema,
} from '../types/embedding-model.types'

import { ConfirmModal } from './ConfirmModal'

export class AddEmbeddingModelModal extends Modal {
  private plugin: SmartComposerPlugin
  private onSubmit: () => void
  private formData: Omit<EmbeddingModel, 'dimension'> = {
    providerId: DEFAULT_PROVIDERS[0].id,
    providerType: DEFAULT_PROVIDERS[0].type,
    id: '',
    model: '',
  }
  private settings: Map<keyof EmbeddingModel, Setting> = new Map()

  constructor(app: App, plugin: SmartComposerPlugin, onSubmit: () => void) {
    super(app)
    this.plugin = plugin
    this.onSubmit = onSubmit
  }

  onOpen() {
    const { contentEl } = this
    contentEl.empty()

    this.titleEl.setText('Add Custom Embedding Model')

    new Setting(contentEl)
      .setName('ID')
      .setDesc(
        'Choose an ID to identify this model in your settings. This is just for your reference.',
      )
      .addText((text) =>
        text
          .setPlaceholder('my-custom-embedding-model')
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
              this.plugin.settings.providers
                .filter(
                  (provider) =>
                    PROVIDER_TYPES_INFO[provider.type].supportEmbedding,
                )
                .map((provider) => [provider.id, provider.id]),
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
            try {
              if (
                this.plugin.settings.embeddingModels.some(
                  (p) => p.id === this.formData.id,
                )
              ) {
                throw new Error(
                  'Model with this ID already exists. Try a different ID.',
                )
              }

              if (
                !this.plugin.settings.providers.some(
                  (provider) => provider.id === this.formData.providerId,
                )
              ) {
                throw new Error('Provider with this ID does not exist')
              }

              const providerClient = getProviderClient({
                settings: this.plugin.settings,
                providerId: this.formData.providerId,
              })

              const embeddingResult = await providerClient.getEmbedding(
                this.formData.model,
                'test',
              )

              if (
                !Array.isArray(embeddingResult) ||
                embeddingResult.length === 0
              ) {
                throw new Error('Embedding model returned an invalid result')
              }

              const dimension = embeddingResult.length

              if (!supportedDimensionsForIndex.includes(dimension)) {
                const confirmed = await new Promise<boolean>((resolve) => {
                  new ConfirmModal(
                    this.app,
                    'Performance Warning',
                    `This model outputs ${dimension} dimensions, but the optimized dimensions for database indexing are: ${supportedDimensionsForIndex.join(', ')}.\n\nThis may result in slower search performance.\n\nDo you want to continue anyway?`,
                    () => resolve(true),
                    () => resolve(false),
                  ).open()
                })

                if (!confirmed) {
                  return
                }
              }

              const embeddingModel: EmbeddingModel = {
                ...this.formData,
                dimension,
              }

              const validationResult =
                embeddingModelSchema.safeParse(embeddingModel)

              if (!validationResult.success) {
                throw new Error(
                  validationResult.error.issues
                    .map((v) => v.message)
                    .join('\n'),
                )
              }

              await this.plugin.setSettings({
                ...this.plugin.settings,
                embeddingModels: [
                  ...this.plugin.settings.embeddingModels,
                  embeddingModel,
                ],
              })

              this.close()
              this.onSubmit()
            } catch (error) {
              new Notice(
                error instanceof Error
                  ? error.message
                  : 'An unknown error occurred',
              )
            }
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
