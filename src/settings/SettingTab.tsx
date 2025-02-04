import { App, Notice, PluginSettingTab, Setting, setIcon } from 'obsidian'

import {
  DEFAULT_CHAT_MODELS,
  DEFAULT_EMBEDDING_MODELS,
  DEFAULT_PROVIDERS,
  PROVIDER_TYPES_INFO,
} from '../constants'
import { getEmbeddingModelClient } from '../core/rag/embedding'
import SmartCopilotPlugin from '../main'
import { findFilesMatchingPatterns } from '../utils/globUtils'

import { AddChatModelModal } from './AddChatModelModal'
import { AddEmbeddingModelModal } from './AddEmbeddingModelModal'
import { AddProviderModal } from './AddProviderModal'
import { ConfirmModal } from './ConfirmModal'
import { EditChatModelModal } from './EditChatModelModal'
import { EditProviderModal } from './EditProviderModal'
import { EmbeddingDbManageModal } from './EmbeddingDbManageModal'
import { ExcludedFilesModal } from './ExcludedFilesModal'
import { IncludedFilesModal } from './IncludedFilesModal'
import { smartCopilotSettingsSchema } from './schema/setting.types'

export class SmartCopilotSettingTab extends PluginSettingTab {
  plugin: SmartCopilotPlugin

  constructor(app: App, plugin: SmartCopilotPlugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  display(): void {
    const { containerEl } = this
    containerEl.empty()

    /**
     * Sections
     * 1. Providers
     * 2. Models
     * 3. Chat
     * 4. RAG
     */

    this.renderProvidersSection(containerEl)
    this.renderModelsSection(containerEl)
    this.renderChatSection(containerEl)

    this.renderRAGSection(containerEl)
    this.renderEtcSection(containerEl)
  }

  renderProvidersSection(containerEl: HTMLElement): void {
    // create heading
    containerEl.createDiv({
      text: 'Providers',
      cls: 'smtcmp-settings-header',
    })

    // create description
    const descContainer = containerEl.createDiv({
      cls: 'smtcmp-settings-desc',
    })
    descContainer.createEl('span', {
      text: 'Enter your API keys for the providers you want to use',
    })
    descContainer.createEl('br')
    descContainer.createEl('a', {
      text: 'How to obtain API keys',
      attr: {
        href: 'https://github.com/glowingjade/obsidian-smart-composer/wiki/1.2-Initial-Setup#getting-your-api-key',
        target: '_blank',
      },
    })

    // create table
    const table = containerEl.createEl('table', {
      cls: 'smtcmp-settings-provider-table',
    })
    const thead = table.createEl('thead')
    const headerRow = thead.createEl('tr')

    headerRow.createEl('th', { text: 'ID' })
    headerRow.createEl('th', { text: 'Type' })
    headerRow.createEl('th', { text: 'API Key' })
    headerRow.createEl('th', { text: 'Actions' })

    const tbody = table.createEl('tbody')

    this.plugin.settings.providers.forEach((provider) => {
      const row = tbody.createEl('tr')

      // provider id cell
      row.createEl('td', { text: provider.id })

      // provider type cell
      row.createEl('td', { text: PROVIDER_TYPES_INFO[provider.type].label })

      // api key cell
      const apiKeyCell = row.createEl('td', {
        cls: 'smtcmp-settings-provider-table-api-key',
        text: provider.apiKey ? '••••••••' : 'Set API key',
      })
      apiKeyCell.addEventListener('click', () => {
        new EditProviderModal(this.app, this.plugin, provider, () =>
          this.display(),
        ).open()
      })

      // actions cell
      const actionsCell = row.createEl('td')
      const actionsContainer = actionsCell.createEl('div', {
        cls: 'smtcmp-settings-provider-actions',
      })

      const settingsButton = actionsContainer.createEl('button')
      setIcon(settingsButton, 'settings')
      settingsButton.addEventListener('click', () => {
        new EditProviderModal(this.app, this.plugin, provider, () =>
          this.display(),
        ).open()
      })

      if (!DEFAULT_PROVIDERS.some((v) => v.id === provider.id)) {
        // prevent default provider being removed
        const removeButton = actionsContainer.createEl('button')
        setIcon(removeButton, 'trash')
        removeButton.addEventListener('click', async () => {
          // Get associated models
          const associatedChatModels = this.plugin.settings.chatModels.filter(
            (m) => m.providerId === provider.id,
          )
          const associatedEmbeddingModels =
            this.plugin.settings.embeddingModels.filter(
              (m) => m.providerId === provider.id,
            )

          const message =
            `Are you sure you want to delete provider "${provider.id}"?\n\n` +
            `This will also delete:\n` +
            `- ${associatedChatModels.length} chat model(s)\n` +
            `- ${associatedEmbeddingModels.length} embedding model(s)\n\n` +
            `All embeddings generated using the associated embedding models will also be deleted.`

          new ConfirmModal(this.app, 'Delete Provider', message, async () => {
            const vectorManager = (
              await this.plugin.getDbManager()
            ).getVectorManager()
            const embeddingStats = await vectorManager.getEmbeddingStats()

            // Clear embeddings for each associated embedding model
            for (const embeddingModel of associatedEmbeddingModels) {
              const embeddingStat = embeddingStats.find(
                (v) => v.model === embeddingModel.id,
              )

              if (embeddingStat?.rowCount && embeddingStat.rowCount > 0) {
                // only clear when there's data
                const embeddingModelClient = getEmbeddingModelClient({
                  settings: this.plugin.settings,
                  embeddingModelId: embeddingModel.id,
                })
                await vectorManager.clearAllVectors(embeddingModelClient)
              }
            }

            await this.plugin.setSettings({
              ...this.plugin.settings,
              providers: [...this.plugin.settings.providers].filter(
                (v) => v.id !== provider.id,
              ),
              chatModels: [...this.plugin.settings.chatModels].filter(
                (v) => v.providerId !== provider.id,
              ),
              embeddingModels: [...this.plugin.settings.embeddingModels].filter(
                (v) => v.providerId !== provider.id,
              ),
            })
            this.display()
          }).open()
        })
      }
    })

    const tfoot = table.createEl('tfoot')
    const footerRow = tfoot.createEl('tr')
    const footerCell = footerRow.createEl('td', {
      attr: {
        colspan: 4,
      },
    })
    const addCustomProviderButton = footerCell.createEl('button', {
      text: 'Add custom provider',
    })
    addCustomProviderButton.addEventListener('click', () => {
      new AddProviderModal(this.app, this.plugin, () => this.display()).open()
    })
  }

  renderModelsSection(containerEl: HTMLElement): void {
    containerEl.createDiv({
      text: 'Models',
      cls: 'smtcmp-settings-header',
    })

    this.renderChatModelsSubSection(containerEl)
    this.renderEmbeddingModelsSubSection(containerEl)
  }

  renderChatModelsSubSection(containerEl: HTMLElement): void {
    containerEl.createDiv({
      text: 'Chat Models',
      cls: 'smtcmp-settings-sub-header',
    })

    // create description
    containerEl.createDiv({
      text: 'Models used for chat and apply',
      cls: 'smtcmp-settings-desc',
    })

    // create table
    const table = containerEl.createEl('table', {
      cls: 'smtcmp-settings-model-table',
    })
    const thead = table.createEl('thead')
    const headerRow = thead.createEl('tr')

    headerRow.createEl('th', { text: 'ID' })
    headerRow.createEl('th', { text: 'Provider ID' })
    headerRow.createEl('th', { text: 'Model' })
    headerRow.createEl('th', { text: 'Actions' })

    const tbody = table.createEl('tbody')

    this.plugin.settings.chatModels.forEach((chatModel) => {
      const row = tbody.createEl('tr')

      // id cell
      row.createEl('td', { text: chatModel.id })

      // provider id cell
      row.createEl('td', { text: chatModel.providerId })

      // model cell
      row.createEl('td', { text: chatModel.model })

      // actions cell
      const actionsCell = row.createEl('td')
      const actionsContainer = actionsCell.createEl('div', {
        cls: 'smtcmp-settings-model-actions',
      })

      const settingsButton = actionsContainer.createEl('button')
      setIcon(settingsButton, 'settings')
      settingsButton.addEventListener('click', () => {
        new EditChatModelModal(this.app, this.plugin, chatModel, () =>
          this.display(),
        ).open()
      })

      if (!DEFAULT_CHAT_MODELS.some((v) => v.id === chatModel.id)) {
        // prevent default chat model being removed
        const removeButton = actionsContainer.createEl('button')
        setIcon(removeButton, 'trash')
        removeButton.addEventListener('click', async () => {
          await this.plugin.setSettings({
            ...this.plugin.settings,
            chatModels: [...this.plugin.settings.chatModels].filter(
              (v) => v.id !== chatModel.id,
            ),
          })
          this.display()
        })
      }
    })

    const tfoot = table.createEl('tfoot')
    const footerRow = tfoot.createEl('tr')
    const footerCell = footerRow.createEl('td', {
      attr: {
        colspan: 4,
      },
    })
    const addCustomChatModelButton = footerCell.createEl('button', {
      text: 'Add custom model',
    })
    addCustomChatModelButton.addEventListener('click', () => {
      new AddChatModelModal(this.app, this.plugin, () => this.display()).open()
    })
  }

  renderEmbeddingModelsSubSection(containerEl: HTMLElement): void {
    containerEl.createDiv({
      text: 'Embedding Models',
      cls: 'smtcmp-settings-sub-header',
    })

    // create description
    containerEl.createDiv({
      text: 'Models used for generating embeddings for RAG',
      cls: 'smtcmp-settings-desc',
    })

    // create table
    const table = containerEl.createEl('table', {
      cls: 'smtcmp-settings-model-table',
    })
    const thead = table.createEl('thead')
    const headerRow = thead.createEl('tr')

    headerRow.createEl('th', { text: 'ID' })
    headerRow.createEl('th', { text: 'Provider ID' })
    headerRow.createEl('th', { text: 'Model' })
    headerRow.createEl('th', { text: 'Dimension' })
    headerRow.createEl('th', { text: 'Actions' })

    const tbody = table.createEl('tbody')

    this.plugin.settings.embeddingModels.forEach((embeddingModel) => {
      const row = tbody.createEl('tr')

      // id cell
      row.createEl('td', { text: embeddingModel.id })

      // provider id cell
      row.createEl('td', { text: embeddingModel.providerId })

      // model cell
      row.createEl('td', { text: embeddingModel.model })

      // dimension cell
      row.createEl('td', { text: String(embeddingModel.dimension) })

      // actions cell
      const actionsCell = row.createEl('td')
      const actionsContainer = actionsCell.createEl('div', {
        cls: 'smtcmp-settings-model-actions',
      })

      if (!DEFAULT_EMBEDDING_MODELS.some((v) => v.id === embeddingModel.id)) {
        // prevent default embedding model being removed
        const removeButton = actionsContainer.createEl('button')
        setIcon(removeButton, 'trash')
        removeButton.addEventListener('click', async () => {
          const message =
            `Are you sure you want to delete embedding model "${embeddingModel.id}"?\n\n` +
            `This will also delete all embeddings generated using this model from the database.`

          new ConfirmModal(
            this.app,
            'Delete Embedding Model',
            message,
            async () => {
              const vectorManager = (
                await this.plugin.getDbManager()
              ).getVectorManager()
              const embeddingStats = await vectorManager.getEmbeddingStats()
              const embeddingStat = embeddingStats.find(
                (v) => v.model === embeddingModel.id,
              )

              if (embeddingStat?.rowCount && embeddingStat.rowCount > 0) {
                // only clear when there's data
                const embeddingModelClient = getEmbeddingModelClient({
                  settings: this.plugin.settings,
                  embeddingModelId: embeddingModel.id,
                })
                await vectorManager.clearAllVectors(embeddingModelClient)
              }

              await this.plugin.setSettings({
                ...this.plugin.settings,
                embeddingModels: [
                  ...this.plugin.settings.embeddingModels,
                ].filter((v) => v.id !== embeddingModel.id),
              })
              this.display()
            },
          ).open()
        })
      }
    })

    const tfoot = table.createEl('tfoot')
    const footerRow = tfoot.createEl('tr')
    const footerCell = footerRow.createEl('td', {
      attr: {
        colspan: 5,
      },
    })
    const addCustomEmbeddingModelButton = footerCell.createEl('button', {
      text: 'Add custom model',
    })
    addCustomEmbeddingModelButton.addEventListener('click', () => {
      new AddEmbeddingModelModal(this.app, this.plugin, () =>
        this.display(),
      ).open()
    })
  }

  renderChatSection(containerEl: HTMLElement): void {
    containerEl.createDiv({
      text: 'Chat',
      cls: 'smtcmp-settings-header',
    })

    new Setting(containerEl)
      .setName('Chat model')
      .setDesc('Choose the model you want to use for chat')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(
            Object.fromEntries(
              this.plugin.settings.chatModels.map((chatModel) => [
                chatModel.id,
                chatModel.id,
              ]),
            ),
          )
          .setValue(this.plugin.settings.chatModelId)
          .onChange(async (value) => {
            await this.plugin.setSettings({
              ...this.plugin.settings,
              chatModelId: value,
            })
          }),
      )

    new Setting(containerEl)
      .setName('Apply model')
      .setDesc('Choose the model you want to use for apply feature')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(
            Object.fromEntries(
              this.plugin.settings.chatModels.map((chatModel) => [
                chatModel.id,
                chatModel.id,
              ]),
            ),
          )
          .setValue(this.plugin.settings.applyModelId)
          .onChange(async (value) => {
            await this.plugin.setSettings({
              ...this.plugin.settings,
              applyModelId: value,
            })
          }),
      )

    new Setting(containerEl)
      .setHeading()
      .setName('System prompt')
      .setDesc('This prompt will be added to the beginning of every chat.')

    new Setting(containerEl)
      .setClass('smtcmp-settings-textarea')
      .addTextArea((text) =>
        text
          .setValue(this.plugin.settings.systemPrompt)
          .onChange(async (value) => {
            await this.plugin.setSettings({
              ...this.plugin.settings,
              systemPrompt: value,
            })
          }),
      )
  }

  renderRAGSection(containerEl: HTMLElement): void {
    containerEl.createDiv({
      text: 'RAG',
      cls: 'smtcmp-settings-header',
    })

    new Setting(containerEl)
      .setName('Embedding model')
      .setDesc('Choose the model you want to use for embeddings')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(
            Object.fromEntries(
              this.plugin.settings.embeddingModels.map((embeddingModel) => [
                embeddingModel.id,
                embeddingModel.id,
              ]),
            ),
          )
          .setValue(this.plugin.settings.embeddingModelId)
          .onChange(async (value) => {
            await this.plugin.setSettings({
              ...this.plugin.settings,
              embeddingModelId: value,
            })
          }),
      )

    new Setting(containerEl)
      .setName('Include patterns')
      .setDesc(
        'If any patterns are specified, ONLY files matching at least one pattern will be included in indexing. One pattern per line. Uses glob patterns (e.g., "notes/*", "*.md"). Leave empty to include all files not excluded by exclude patterns. After changing this, use the command "Rebuild entire vault index" to apply changes.',
      )
      .addButton((button) =>
        button.setButtonText('Test patterns').onClick(async () => {
          const patterns = this.plugin.settings.ragOptions.includePatterns
          const includedFiles = await findFilesMatchingPatterns(
            patterns,
            this.plugin.app.vault,
          )
          new IncludedFilesModal(this.app, includedFiles, patterns).open()
        }),
      )
    new Setting(containerEl)
      .setClass('smtcmp-settings-textarea')
      .addTextArea((text) =>
        text
          .setValue(this.plugin.settings.ragOptions.includePatterns.join('\n'))
          .onChange(async (value) => {
            const patterns = value
              .split('\n')
              .map((p) => p.trim())
              .filter((p) => p.length > 0)
            await this.plugin.setSettings({
              ...this.plugin.settings,
              ragOptions: {
                ...this.plugin.settings.ragOptions,
                includePatterns: patterns,
              },
            })
          }),
      )

    new Setting(containerEl)
      .setName('Exclude patterns')
      .setDesc(
        'Files matching ANY of these patterns will be excluded from indexing. One pattern per line. Uses glob patterns (e.g., "private/*", "*.tmp"). Leave empty to exclude nothing. After changing this, use the command "Rebuild entire vault index" to apply changes.',
      )
      .addButton((button) =>
        button.setButtonText('Test patterns').onClick(async () => {
          const patterns = this.plugin.settings.ragOptions.excludePatterns
          const excludedFiles = await findFilesMatchingPatterns(
            patterns,
            this.plugin.app.vault,
          )
          new ExcludedFilesModal(this.app, excludedFiles).open()
        }),
      )
    new Setting(containerEl)
      .setClass('smtcmp-settings-textarea')
      .addTextArea((text) =>
        text
          .setValue(this.plugin.settings.ragOptions.excludePatterns.join('\n'))
          .onChange(async (value) => {
            const patterns = value
              .split('\n')
              .map((p) => p.trim())
              .filter((p) => p.length > 0)
            await this.plugin.setSettings({
              ...this.plugin.settings,
              ragOptions: {
                ...this.plugin.settings.ragOptions,
                excludePatterns: patterns,
              },
            })
          }),
      )

    new Setting(containerEl)
      .setName('Chunk size')
      .setDesc(
        'Set the chunk size for text splitting. After changing this, please re-index the vault using the "Rebuild entire vault index" command.',
      )
      .addText((text) =>
        text
          .setPlaceholder('1000')
          .setValue(String(this.plugin.settings.ragOptions.chunkSize))
          .onChange(async (value) => {
            const chunkSize = parseInt(value, 10)
            if (!isNaN(chunkSize)) {
              await this.plugin.setSettings({
                ...this.plugin.settings,
                ragOptions: {
                  ...this.plugin.settings.ragOptions,
                  chunkSize,
                },
              })
            }
          }),
      )

    new Setting(containerEl)
      .setName('Threshold tokens')
      .setDesc(
        'Maximum number of tokens before switching to RAG. If the total tokens from mentioned files exceed this, RAG will be used instead of including all file contents.',
      )
      .addText((text) =>
        text
          .setPlaceholder('8192')
          .setValue(String(this.plugin.settings.ragOptions.thresholdTokens))
          .onChange(async (value) => {
            const thresholdTokens = parseInt(value, 10)
            if (!isNaN(thresholdTokens)) {
              await this.plugin.setSettings({
                ...this.plugin.settings,
                ragOptions: {
                  ...this.plugin.settings.ragOptions,
                  thresholdTokens,
                },
              })
            }
          }),
      )

    new Setting(containerEl)
      .setName('Minimum similarity')
      .setDesc(
        'Minimum similarity score for RAG results. Higher values return more relevant but potentially fewer results.',
      )
      .addText((text) =>
        text
          .setPlaceholder('0.0')
          .setValue(String(this.plugin.settings.ragOptions.minSimilarity))
          .onChange(async (value) => {
            const minSimilarity = parseFloat(value)
            if (!isNaN(minSimilarity)) {
              await this.plugin.setSettings({
                ...this.plugin.settings,
                ragOptions: {
                  ...this.plugin.settings.ragOptions,
                  minSimilarity,
                },
              })
            }
          }),
      )

    new Setting(containerEl)
      .setName('Limit')
      .setDesc(
        'Maximum number of RAG results to include in the prompt. Higher values provide more context but increase token usage.',
      )
      .addText((text) =>
        text
          .setPlaceholder('10')
          .setValue(String(this.plugin.settings.ragOptions.limit))
          .onChange(async (value) => {
            const limit = parseInt(value, 10)
            if (!isNaN(limit)) {
              await this.plugin.setSettings({
                ...this.plugin.settings,
                ragOptions: {
                  ...this.plugin.settings.ragOptions,
                  limit,
                },
              })
            }
          }),
      )

    new Setting(containerEl)
      .setName('Manage Embedding Database')
      .addButton((button) =>
        button.setButtonText('Manage').onClick(async () => {
          new EmbeddingDbManageModal(this.app, this.plugin).open()
        }),
      )
  }

  renderEtcSection(containerEl: HTMLElement): void {
    containerEl.createDiv({
      text: 'Etc',
      cls: 'smtcmp-settings-header',
    })

    new Setting(containerEl)
      .setName('Reset settings')
      .setDesc('Reset all settings to default values')
      .addButton((button) =>
        button
          .setButtonText('Reset')
          .setWarning()
          .onClick(() => {
            new ConfirmModal(
              this.app,
              'Reset settings',
              'Are you sure you want to reset all settings to default values? This cannot be undone.',
              async () => {
                const defaultSettings = smartCopilotSettingsSchema.parse({})
                await this.plugin.setSettings(defaultSettings)
                new Notice('Settings have been reset to defaults')
                this.display()
              },
            ).open()
          }),
      )
  }

  // private async updateOllamaModelOptions({
  //   baseUrl,
  //   dropdown,
  //   onModelChange,
  // }: {
  //   baseUrl: string
  //   dropdown: DropdownComponent
  //   onModelChange: (model: string) => Promise<void>
  // }): Promise<void> {
  //   const currentValue = dropdown.getValue()
  //   dropdown.selectEl.empty()

  //   try {
  //     const models = await getOllamaModels(baseUrl)
  //     if (models.length > 0) {
  //       const modelOptions = models.reduce<Record<string, string>>(
  //         (acc, model) => {
  //           acc[model] = model
  //           return acc
  //         },
  //         {},
  //       )

  //       dropdown.addOptions(modelOptions)

  //       if (models.includes(currentValue)) {
  //         dropdown.setValue(currentValue)
  //       } else {
  //         dropdown.setValue(models[0])
  //         await onModelChange(models[0])
  //       }
  //     } else {
  //       dropdown.addOption('', 'No models found - check base URL')
  //       dropdown.setValue('')
  //       await onModelChange('')
  //     }
  //   } catch (error) {
  //     console.error('Failed to fetch Ollama models:', error)
  //     dropdown.addOption('', 'No models found - check base URL')
  //     dropdown.setValue('')
  //     await onModelChange('')
  //   }

  //   dropdown.onChange(async (value) => {
  //     await onModelChange(value)
  //   })
  // }
}
