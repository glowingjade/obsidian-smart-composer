import { App, PluginSettingTab, Setting } from 'obsidian'

import {
  APPLY_MODEL_OPTIONS,
  CHAT_MODEL_OPTIONS,
  EMBEDDING_MODEL_OPTIONS,
} from '../constants'
import SmartCopilotPlugin from '../main'

export class SmartCopilotSettingTab extends PluginSettingTab {
  plugin: SmartCopilotPlugin

  constructor(app: App, plugin: SmartCopilotPlugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  display(): void {
    const { containerEl } = this
    containerEl.empty()

    this.renderAPIKeysSection(containerEl)
    this.renderModelSection(containerEl)
    this.renderRAGSection(containerEl)
  }

  renderAPIKeysSection(containerEl: HTMLElement): void {
    const apiKeysHeading = new Setting(containerEl)
      .setHeading()
      .setName('API keys')
      .setDesc('Enter your API keys for the services you want to use')

    apiKeysHeading.descEl.createEl('br')

    apiKeysHeading.descEl.createEl('a', {
      text: 'How to obtain API keys',
      attr: {
        href: 'https://github.com/glowingjade/obsidian-smart-composer/#initial-setup',
        target: '_blank',
      },
    })

    new Setting(containerEl).setName('OpenAI API key').addText((text) =>
      text
        .setPlaceholder('Enter your API key')
        .setValue(this.plugin.settings.openAIApiKey)
        .onChange(async (value) => {
          await this.plugin.setSettings({
            ...this.plugin.settings,
            openAIApiKey: value,
          })
        }),
    )

    new Setting(containerEl).setName('Anthropic API key').addText((text) =>
      text
        .setPlaceholder('Enter your API key')
        .setValue(this.plugin.settings.anthropicApiKey)
        .onChange(async (value) => {
          await this.plugin.setSettings({
            ...this.plugin.settings,
            anthropicApiKey: value,
          })
        }),
    )

    new Setting(containerEl).setName('Groq API key').addText((text) =>
      text
        .setPlaceholder('Enter your API key')
        .setValue(this.plugin.settings.groqApiKey)
        .onChange(async (value) => {
          await this.plugin.setSettings({
            ...this.plugin.settings,
            groqApiKey: value,
          })
        }),
    )
  }

  renderModelSection(containerEl: HTMLElement): void {
    new Setting(containerEl).setHeading().setName('Model')

    new Setting(containerEl)
      .setName('Chat model')
      .setDesc('Choose the model you want to use for chat')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(
            CHAT_MODEL_OPTIONS.reduce<Record<string, string>>((acc, option) => {
              acc[option.id] = option.name
              return acc
            }, {}),
          )
          .setValue(this.plugin.settings.chatModelId)
          .onChange(async (value) => {
            await this.plugin.setSettings({
              ...this.plugin.settings,
              chatModelId: value,
            })
            // Force refresh to show/hide Ollama and OpenAI-compatible settings
            this.display()
          }),
      )
    if (this.plugin.settings.chatModelId === 'ollama') {
      this.renderOllamaChatModelSettings(containerEl)
    }
    if (this.plugin.settings.chatModelId === 'openai-compatible') {
      this.renderOpenAICompatibleChatModelSettings(containerEl)
    }

    new Setting(containerEl)
      .setName('Apply model')
      .setDesc('Choose the model you want to use for apply')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(
            APPLY_MODEL_OPTIONS.reduce<Record<string, string>>(
              (acc, option) => {
                acc[option.id] = option.name
                return acc
              },
              {},
            ),
          )
          .setValue(this.plugin.settings.applyModelId)
          .onChange(async (value) => {
            await this.plugin.setSettings({
              ...this.plugin.settings,
              applyModelId: value,
            })
            // Force refresh to show/hide Ollama and OpenAI-compatible settings
            this.display()
          }),
      )
    if (this.plugin.settings.applyModelId === 'ollama') {
      this.renderOllamaApplyModelSettings(containerEl)
    }
    if (this.plugin.settings.applyModelId === 'openai-compatible') {
      this.renderOpenAICompatibleApplyModelSettings(containerEl)
    }

    new Setting(containerEl)
      .setName('Embedding model')
      .setDesc('Choose the model you want to use for embeddings')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(
            EMBEDDING_MODEL_OPTIONS.reduce<Record<string, string>>(
              (acc, option) => {
                acc[option.id] = option.name
                return acc
              },
              {},
            ),
          )
          .setValue(this.plugin.settings.embeddingModelId)
          .onChange(async (value) => {
            await this.plugin.setSettings({
              ...this.plugin.settings,
              embeddingModelId: value,
            })
            // Force refresh to show/hide Ollama settings
            this.display()
          }),
      )
    if (this.plugin.settings.embeddingModelId.startsWith('ollama/')) {
      this.renderOllamaEmbeddingModelSettings(containerEl)
    }

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

  renderOllamaChatModelSettings(containerEl: HTMLElement): void {
    const ollamaContainer = containerEl.createDiv(
      'smtcmp-settings-model-container',
    )

    new Setting(ollamaContainer)
      .setName('Base URL')
      .setDesc(
        'The API endpoint for your Ollama service (e.g., http://127.0.0.1:11434)',
      )
      .addText((text) =>
        text
          .setPlaceholder('http://127.0.0.1:11434')
          .setValue(this.plugin.settings.ollamaChatModel.baseUrl || '')
          .onChange(async (value) => {
            await this.plugin.setSettings({
              ...this.plugin.settings,
              ollamaChatModel: {
                ...this.plugin.settings.ollamaChatModel,
                baseUrl: value,
              },
            })
          }),
      )

    new Setting(ollamaContainer)
      .setName('Model Name')
      .setDesc(
        'The specific model to use with your service (e.g., llama-3.1-70b, mixtral-8x7b)',
      )
      .addText((text) =>
        text
          .setPlaceholder('llama-3.1-70b')
          .setValue(this.plugin.settings.ollamaChatModel.model || '')
          .onChange(async (value) => {
            await this.plugin.setSettings({
              ...this.plugin.settings,
              ollamaChatModel: {
                ...this.plugin.settings.ollamaChatModel,
                model: value,
              },
            })
          }),
      )
  }

  renderOpenAICompatibleChatModelSettings(containerEl: HTMLElement): void {
    const openAICompatContainer = containerEl.createDiv(
      'smtcmp-settings-model-container',
    )

    new Setting(openAICompatContainer)
      .setName('Base URL')
      .setDesc(
        'The API endpoint for your OpenAI-compatible service (e.g., https://api.example.com/v1)',
      )
      .addText((text) =>
        text
          .setPlaceholder('https://api.example.com/v1')
          .setValue(
            this.plugin.settings.openAICompatibleChatModel.baseUrl || '',
          )
          .onChange(async (value) => {
            await this.plugin.setSettings({
              ...this.plugin.settings,
              openAICompatibleChatModel: {
                ...this.plugin.settings.openAICompatibleChatModel,
                baseUrl: value,
              },
            })
          }),
      )

    new Setting(openAICompatContainer)
      .setName('API Key')
      .setDesc('Your authentication key for the OpenAI-compatible service')
      .addText((text) =>
        text
          .setPlaceholder('Enter your API key')
          .setValue(this.plugin.settings.openAICompatibleChatModel.apiKey || '')
          .onChange(async (value) => {
            await this.plugin.setSettings({
              ...this.plugin.settings,
              openAICompatibleChatModel: {
                ...this.plugin.settings.openAICompatibleChatModel,
                apiKey: value,
              },
            })
          }),
      )

    new Setting(openAICompatContainer)
      .setName('Model Name')
      .setDesc(
        'The specific model to use with your service (e.g., llama-3.1-70b, mixtral-8x7b)',
      )
      .addText((text) =>
        text
          .setPlaceholder('llama-3.1-70b')
          .setValue(this.plugin.settings.openAICompatibleChatModel.model || '')
          .onChange(async (value) => {
            await this.plugin.setSettings({
              ...this.plugin.settings,
              openAICompatibleChatModel: {
                ...this.plugin.settings.openAICompatibleChatModel,
                model: value,
              },
            })
          }),
      )
  }

  renderOllamaApplyModelSettings(containerEl: HTMLElement): void {
    const ollamaContainer = containerEl.createDiv(
      'smtcmp-settings-model-container',
    )

    new Setting(ollamaContainer)
      .setName('Base URL')
      .setDesc(
        'The API endpoint for your Ollama service (e.g., http://127.0.0.1:11434)',
      )
      .addText((text) =>
        text
          .setPlaceholder('http://127.0.0.1:11434')
          .setValue(this.plugin.settings.ollamaApplyModel.baseUrl || '')
          .onChange(async (value) => {
            await this.plugin.setSettings({
              ...this.plugin.settings,
              ollamaApplyModel: {
                ...this.plugin.settings.ollamaApplyModel,
                baseUrl: value,
              },
            })
          }),
      )

    new Setting(ollamaContainer)
      .setName('Model Name')
      .setDesc(
        'The specific model to use with your service (e.g., llama-3.1-70b, mixtral-8x7b)',
      )
      .addText((text) =>
        text
          .setPlaceholder('llama-3.1-70b')
          .setValue(this.plugin.settings.ollamaApplyModel.model || '')
          .onChange(async (value) => {
            await this.plugin.setSettings({
              ...this.plugin.settings,
              ollamaApplyModel: {
                ...this.plugin.settings.ollamaApplyModel,
                model: value,
              },
            })
          }),
      )
  }

  renderOpenAICompatibleApplyModelSettings(containerEl: HTMLElement): void {
    const openAICompatContainer = containerEl.createDiv(
      'smtcmp-settings-model-container',
    )

    new Setting(openAICompatContainer)
      .setName('Base URL')
      .setDesc(
        'The API endpoint for your OpenAI-compatible service (e.g., https://api.example.com/v1)',
      )
      .addText((text) =>
        text
          .setPlaceholder('https://api.example.com/v1')
          .setValue(
            this.plugin.settings.openAICompatibleApplyModel.baseUrl || '',
          )
          .onChange(async (value) => {
            await this.plugin.setSettings({
              ...this.plugin.settings,
              openAICompatibleApplyModel: {
                ...this.plugin.settings.openAICompatibleApplyModel,
                baseUrl: value,
              },
            })
          }),
      )

    new Setting(openAICompatContainer)
      .setName('API Key')
      .setDesc('Your authentication key for the OpenAI-compatible service')
      .addText((text) =>
        text
          .setPlaceholder('Enter your API key')
          .setValue(
            this.plugin.settings.openAICompatibleApplyModel.apiKey || '',
          )
          .onChange(async (value) => {
            await this.plugin.setSettings({
              ...this.plugin.settings,
              openAICompatibleApplyModel: {
                ...this.plugin.settings.openAICompatibleApplyModel,
                apiKey: value,
              },
            })
          }),
      )

    new Setting(openAICompatContainer)
      .setName('Model Name')
      .setDesc(
        'The specific model to use with your service (e.g., llama-3.1-70b, mixtral-8x7b)',
      )
      .addText((text) =>
        text
          .setPlaceholder('llama-3.1-70b')
          .setValue(this.plugin.settings.openAICompatibleApplyModel.model || '')
          .onChange(async (value) => {
            await this.plugin.setSettings({
              ...this.plugin.settings,
              openAICompatibleApplyModel: {
                ...this.plugin.settings.openAICompatibleApplyModel,
                model: value,
              },
            })
          }),
      )
  }

  renderOllamaEmbeddingModelSettings(containerEl: HTMLElement): void {
    const ollamaContainer = containerEl.createDiv(
      'smtcmp-settings-model-container',
    )

    new Setting(ollamaContainer)
      .setName('Base URL')
      .setDesc(
        'The API endpoint for your Ollama service (e.g., http://127.0.0.1:11434)',
      )
      .addText((text) =>
        text
          .setPlaceholder('http://127.0.0.1:11434')
          .setValue(this.plugin.settings.ollamaEmbeddingModel.baseUrl || '')
          .onChange(async (value) => {
            await this.plugin.setSettings({
              ...this.plugin.settings,
              ollamaEmbeddingModel: {
                ...this.plugin.settings.ollamaEmbeddingModel,
                baseUrl: value,
              },
            })
          }),
      )
  }

  renderRAGSection(containerEl: HTMLElement): void {
    new Setting(containerEl).setHeading().setName('RAG')

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
  }
}
