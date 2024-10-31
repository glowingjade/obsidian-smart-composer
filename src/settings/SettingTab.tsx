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

    new Setting(containerEl)
      .setName('Ollama address')
      .setDesc(
        'Set the Ollama URL and port address - normally http://127.0.0.1:11434',
      )
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.ollamaBaseUrl))
          .onChange(async (value) => {
            await this.plugin.setSettings({
              ...this.plugin.settings,
              ollamaBaseUrl: value,
            })
          }),
      )

    new Setting(containerEl).setHeading().setName('Model')

    new Setting(containerEl)
      .setName('Chat model')
      .setDesc('Choose the model you want to use for chat')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(
            CHAT_MODEL_OPTIONS.reduce<Record<string, string>>((acc, option) => {
              acc[option.value] = option.name
              return acc
            }, {}),
          )
          .setValue(this.plugin.settings.chatModel)
          .onChange(async (value) => {
            await this.plugin.setSettings({
              ...this.plugin.settings,
              chatModel: value,
            })
          }),
      )

    new Setting(containerEl)
      .setName('Apply model')
      .setDesc('Choose the model you want to use for apply')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(
            APPLY_MODEL_OPTIONS.reduce<Record<string, string>>(
              (acc, option) => {
                acc[option.value] = option.name
                return acc
              },
              {},
            ),
          )
          .setValue(this.plugin.settings.applyModel)
          .onChange(async (value) => {
            await this.plugin.setSettings({
              ...this.plugin.settings,
              applyModel: value,
            })
          }),
      )

    new Setting(containerEl)
      .setName('Embedding model')
      .setDesc('Choose the model you want to use for embeddings')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(
            EMBEDDING_MODEL_OPTIONS.reduce<Record<string, string>>(
              (acc, option) => {
                acc[option.value] = option.name
                return acc
              },
              {},
            ),
          )
          .setValue(this.plugin.settings.embeddingModel)
          .onChange(async (value) => {
            await this.plugin.setSettings({
              ...this.plugin.settings,
              embeddingModel: value,
            })
          }),
      )

    new Setting(containerEl)
      .setHeading()
      .setName('System prompt')
      .setDesc('This prompt will be added to the beginning of every chat.')

    new Setting(containerEl)
      .setClass('smtcmp-setting-textarea')
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
