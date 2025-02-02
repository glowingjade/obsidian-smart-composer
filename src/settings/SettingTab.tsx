import { App, PluginSettingTab, Setting, setIcon } from 'obsidian'

import { DEFAULT_PROVIDERS, PROVIDER_TYPES_INFO } from '../constants'
import SmartCopilotPlugin from '../main'
import { findFilesMatchingPatterns } from '../utils/globUtils'

import { AddProviderModal } from './AddProviderModal'
import { EditProviderModal } from './EditProviderModal'
import { EmbeddingDbManageModal } from './EmbeddingDbManageModal'
import { ExcludedFilesModal } from './ExcludedFilesModal'
import { IncludedFilesModal } from './IncludedFilesModal'

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
  }

  renderProvidersSection(containerEl: HTMLElement): void {
    // create heading
    containerEl.createEl('h1', {
      text: 'Providers',
    })

    // create description
    const descContainer = containerEl.createEl('p', {
      cls: 'smtcmp-settings-provider-desc',
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

    headerRow.createEl('th', { text: 'Provider ID' })
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
          // TODO: should confirm to delete all models belong to this provider
          await this.plugin.setSettings({
            ...this.plugin.settings,
            providers: [...this.plugin.settings.providers].filter(
              (v) => v.id !== provider.id,
            ),
            chatModels: [...this.plugin.settings.chatModels].filter(
              (v) => v.providerId !== provider.id,
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
    const addCustomProviderButton = footerCell.createEl('button', {
      text: 'Add custom provider',
    })
    addCustomProviderButton.addEventListener('click', () => {
      new AddProviderModal(this.app, this.plugin, () => this.display()).open()
    })
  }

  renderModelsSection(containerEl: HTMLElement): void {
    new Setting(containerEl).setHeading().setName('Models')
  }

  renderChatSection(containerEl: HTMLElement): void {
    new Setting(containerEl).setHeading().setName('Model')

    // new Setting(containerEl)
    //   .setName('Chat model')
    //   .setDesc('Choose the model you want to use for chat')
    //   .addDropdown((dropdown) =>
    //     dropdown
    //       .addOptions(
    //         CHAT_MODEL_OPTIONS.reduce<Record<string, string>>((acc, option) => {
    //           acc[option.id] = option.name
    //           return acc
    //         }, {}),
    //       )
    //       .setValue(this.plugin.settings.chatModelId)
    //       .onChange(async (value) => {
    //         await this.plugin.setSettings({
    //           ...this.plugin.settings,
    //           chatModelId: value,
    //         })
    //         // Force refresh to show/hide Ollama and OpenAI-compatible settings
    //         this.display()
    //       }),
    //   )
    // if (this.plugin.settings.chatModelId === 'ollama') {
    //   this.renderOllamaChatModelSettings(containerEl)
    // }
    // if (this.plugin.settings.chatModelId === 'openai-compatible') {
    //   this.renderOpenAICompatibleChatModelSettings(containerEl)
    // }

    // new Setting(containerEl)
    //   .setName('Apply model')
    //   .setDesc('Choose the model you want to use for apply')
    //   .addDropdown((dropdown) =>
    //     dropdown
    //       .addOptions(
    //         APPLY_MODEL_OPTIONS.reduce<Record<string, string>>(
    //           (acc, option) => {
    //             acc[option.id] = option.name
    //             return acc
    //           },
    //           {},
    //         ),
    //       )
    //       .setValue(this.plugin.settings.applyModelId)
    //       .onChange(async (value) => {
    //         await this.plugin.setSettings({
    //           ...this.plugin.settings,
    //           applyModelId: value,
    //         })
    //         // Force refresh to show/hide Ollama and OpenAI-compatible settings
    //         this.display()
    //       }),
    //   )
    // if (this.plugin.settings.applyModelId === 'ollama') {
    //   this.renderOllamaApplyModelSettings(containerEl)
    // }
    // if (this.plugin.settings.applyModelId === 'openai-compatible') {
    //   this.renderOpenAICompatibleApplyModelSettings(containerEl)
    // }

    // new Setting(containerEl)
    //   .setName('Embedding model')
    //   .setDesc('Choose the model you want to use for embeddings')
    //   .addDropdown((dropdown) =>
    //     dropdown
    //       .addOptions(
    //         EMBEDDING_MODEL_OPTIONS.reduce<Record<string, string>>(
    //           (acc, option) => {
    //             acc[option.id] = option.name
    //             return acc
    //           },
    //           {},
    //         ),
    //       )
    //       .setValue(this.plugin.settings.embeddingModelId)
    //       .onChange(async (value) => {
    //         await this.plugin.setSettings({
    //           ...this.plugin.settings,
    //           embeddingModelId: value,
    //         })
    //         // Force refresh to show/hide Ollama settings
    //         this.display()
    //       }),
    //   )
    // if (this.plugin.settings.embeddingModelId.startsWith('ollama/')) {
    //   this.renderOllamaEmbeddingModelSettings(containerEl)
    // }

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

  // renderOllamaChatModelSettings(containerEl: HTMLElement): void {
  //   const ollamaContainer = containerEl.createDiv(
  //     'smtcmp-settings-model-container',
  //   )
  //   let modelDropdown: DropdownComponent | null = null // Store reference to the dropdown

  //   // Base URL Setting
  //   new Setting(ollamaContainer)
  //     .setName('Base URL')
  //     .setDesc(
  //       'The API endpoint for your Ollama service (e.g., http://127.0.0.1:11434)',
  //     )
  //     .addText((text) => {
  //       text
  //         .setPlaceholder('http://127.0.0.1:11434')
  //         .setValue(this.plugin.settings.ollamaChatModel.baseUrl || '')
  //         .onChange(async (value) => {
  //           await this.plugin.setSettings({
  //             ...this.plugin.settings,
  //             ollamaChatModel: {
  //               ...this.plugin.settings.ollamaChatModel,
  //               baseUrl: value,
  //             },
  //           })
  //           if (modelDropdown) {
  //             await this.updateOllamaModelOptions({
  //               baseUrl: value,
  //               dropdown: modelDropdown,
  //               onModelChange: async (model: string) => {
  //                 await this.plugin.setSettings({
  //                   ...this.plugin.settings,
  //                   ollamaChatModel: {
  //                     ...this.plugin.settings.ollamaChatModel,
  //                     model,
  //                   },
  //                 })
  //               },
  //             })
  //           }
  //         })
  //     })

  //   // Model Setting
  //   new Setting(ollamaContainer)
  //     .setName('Model Name')
  //     .setDesc('Select a model from your Ollama instance')
  //     .addDropdown(async (dropdown) => {
  //       const currentModel = this.plugin.settings.ollamaChatModel.model
  //       modelDropdown = dropdown
  //         .addOption(currentModel, currentModel)
  //         .setValue(currentModel)
  //       await this.updateOllamaModelOptions({
  //         baseUrl: this.plugin.settings.ollamaChatModel.baseUrl,
  //         dropdown,
  //         onModelChange: async (model: string) => {
  //           await this.plugin.setSettings({
  //             ...this.plugin.settings,
  //             ollamaChatModel: {
  //               ...this.plugin.settings.ollamaChatModel,
  //               model,
  //             },
  //           })
  //         },
  //       })
  //     })
  // }

  // renderOpenAICompatibleChatModelSettings(containerEl: HTMLElement): void {
  //   const openAICompatContainer = containerEl.createDiv(
  //     'smtcmp-settings-model-container',
  //   )

  //   new Setting(openAICompatContainer)
  //     .setName('Base URL')
  //     .setDesc(
  //       'The API endpoint for your OpenAI-compatible service (e.g., https://api.example.com/v1)',
  //     )
  //     .addText((text) =>
  //       text
  //         .setPlaceholder('https://api.example.com/v1')
  //         .setValue(
  //           this.plugin.settings.openAICompatibleChatModel.baseUrl || '',
  //         )
  //         .onChange(async (value) => {
  //           await this.plugin.setSettings({
  //             ...this.plugin.settings,
  //             openAICompatibleChatModel: {
  //               ...this.plugin.settings.openAICompatibleChatModel,
  //               baseUrl: value,
  //             },
  //           })
  //         }),
  //     )

  //   new Setting(openAICompatContainer)
  //     .setName('API Key')
  //     .setDesc('Your authentication key for the OpenAI-compatible service')
  //     .addText((text) =>
  //       text
  //         .setPlaceholder('Enter your API key')
  //         .setValue(this.plugin.settings.openAICompatibleChatModel.apiKey || '')
  //         .onChange(async (value) => {
  //           await this.plugin.setSettings({
  //             ...this.plugin.settings,
  //             openAICompatibleChatModel: {
  //               ...this.plugin.settings.openAICompatibleChatModel,
  //               apiKey: value,
  //             },
  //           })
  //         }),
  //     )

  //   new Setting(openAICompatContainer)
  //     .setName('Model Name')
  //     .setDesc(
  //       'The specific model to use with your service (e.g., llama-3.1-70b, mixtral-8x7b)',
  //     )
  //     .addText((text) =>
  //       text
  //         .setPlaceholder('llama-3.1-70b')
  //         .setValue(this.plugin.settings.openAICompatibleChatModel.model || '')
  //         .onChange(async (value) => {
  //           await this.plugin.setSettings({
  //             ...this.plugin.settings,
  //             openAICompatibleChatModel: {
  //               ...this.plugin.settings.openAICompatibleChatModel,
  //               model: value,
  //             },
  //           })
  //         }),
  //     )
  // }

  // renderOllamaApplyModelSettings(containerEl: HTMLElement): void {
  //   const ollamaContainer = containerEl.createDiv(
  //     'smtcmp-settings-model-container',
  //   )
  //   let modelDropdown: DropdownComponent | null = null // Store reference to the dropdown

  //   // Base URL Setting
  //   new Setting(ollamaContainer)
  //     .setName('Base URL')
  //     .setDesc(
  //       'The API endpoint for your Ollama service (e.g., http://127.0.0.1:11434)',
  //     )
  //     .addText((text) => {
  //       text
  //         .setPlaceholder('http://127.0.0.1:11434')
  //         .setValue(this.plugin.settings.ollamaApplyModel.baseUrl || '')
  //         .onChange(async (value) => {
  //           await this.plugin.setSettings({
  //             ...this.plugin.settings,
  //             ollamaApplyModel: {
  //               ...this.plugin.settings.ollamaApplyModel,
  //               baseUrl: value,
  //             },
  //           })
  //           if (modelDropdown) {
  //             await this.updateOllamaModelOptions({
  //               baseUrl: value,
  //               dropdown: modelDropdown,
  //               onModelChange: async (model: string) => {
  //                 await this.plugin.setSettings({
  //                   ...this.plugin.settings,
  //                   ollamaApplyModel: {
  //                     ...this.plugin.settings.ollamaApplyModel,
  //                     model,
  //                   },
  //                 })
  //               },
  //             })
  //           }
  //         })
  //     })

  //   // Model Setting
  //   new Setting(ollamaContainer)
  //     .setName('Model Name')
  //     .setDesc('Select a model from your Ollama instance')
  //     .addDropdown(async (dropdown) => {
  //       const currentModel = this.plugin.settings.ollamaApplyModel.model
  //       modelDropdown = dropdown
  //         .addOption(currentModel, currentModel)
  //         .setValue(currentModel)
  //       await this.updateOllamaModelOptions({
  //         baseUrl: this.plugin.settings.ollamaApplyModel.baseUrl,
  //         dropdown,
  //         onModelChange: async (model: string) => {
  //           await this.plugin.setSettings({
  //             ...this.plugin.settings,
  //             ollamaApplyModel: {
  //               ...this.plugin.settings.ollamaApplyModel,
  //               model,
  //             },
  //           })
  //         },
  //       })
  //     })
  // }

  // renderOpenAICompatibleApplyModelSettings(containerEl: HTMLElement): void {
  //   const openAICompatContainer = containerEl.createDiv(
  //     'smtcmp-settings-model-container',
  //   )

  //   new Setting(openAICompatContainer)
  //     .setName('Base URL')
  //     .setDesc(
  //       'The API endpoint for your OpenAI-compatible service (e.g., https://api.example.com/v1)',
  //     )
  //     .addText((text) =>
  //       text
  //         .setPlaceholder('https://api.example.com/v1')
  //         .setValue(
  //           this.plugin.settings.openAICompatibleApplyModel.baseUrl || '',
  //         )
  //         .onChange(async (value) => {
  //           await this.plugin.setSettings({
  //             ...this.plugin.settings,
  //             openAICompatibleApplyModel: {
  //               ...this.plugin.settings.openAICompatibleApplyModel,
  //               baseUrl: value,
  //             },
  //           })
  //         }),
  //     )

  //   new Setting(openAICompatContainer)
  //     .setName('API Key')
  //     .setDesc('Your authentication key for the OpenAI-compatible service')
  //     .addText((text) =>
  //       text
  //         .setPlaceholder('Enter your API key')
  //         .setValue(
  //           this.plugin.settings.openAICompatibleApplyModel.apiKey || '',
  //         )
  //         .onChange(async (value) => {
  //           await this.plugin.setSettings({
  //             ...this.plugin.settings,
  //             openAICompatibleApplyModel: {
  //               ...this.plugin.settings.openAICompatibleApplyModel,
  //               apiKey: value,
  //             },
  //           })
  //         }),
  //     )

  //   new Setting(openAICompatContainer)
  //     .setName('Model Name')
  //     .setDesc(
  //       'The specific model to use with your service (e.g., llama-3.1-70b, mixtral-8x7b)',
  //     )
  //     .addText((text) =>
  //       text
  //         .setPlaceholder('llama-3.1-70b')
  //         .setValue(this.plugin.settings.openAICompatibleApplyModel.model || '')
  //         .onChange(async (value) => {
  //           await this.plugin.setSettings({
  //             ...this.plugin.settings,
  //             openAICompatibleApplyModel: {
  //               ...this.plugin.settings.openAICompatibleApplyModel,
  //               model: value,
  //             },
  //           })
  //         }),
  //     )
  // }

  // renderOllamaEmbeddingModelSettings(containerEl: HTMLElement): void {
  //   const ollamaContainer = containerEl.createDiv(
  //     'smtcmp-settings-model-container',
  //   )

  //   new Setting(ollamaContainer)
  //     .setName('Base URL')
  //     .setDesc(
  //       'The API endpoint for your Ollama service (e.g., http://127.0.0.1:11434)',
  //     )
  //     .addText((text) =>
  //       text
  //         .setPlaceholder('http://127.0.0.1:11434')
  //         .setValue(this.plugin.settings.ollamaEmbeddingModel.baseUrl || '')
  //         .onChange(async (value) => {
  //           await this.plugin.setSettings({
  //             ...this.plugin.settings,
  //             ollamaEmbeddingModel: {
  //               ...this.plugin.settings.ollamaEmbeddingModel,
  //               baseUrl: value,
  //             },
  //           })
  //         }),
  //     )
  // }

  renderRAGSection(containerEl: HTMLElement): void {
    new Setting(containerEl).setHeading().setName('RAG')

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
