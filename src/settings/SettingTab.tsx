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
      .setName('API Keys')
      .setDesc('Enter your API keys for the services you want to use')

    apiKeysHeading.descEl.createEl('br')

    apiKeysHeading.descEl.createEl('a', {
      text: 'How to obtain API keys',
      attr: {
        href: 'https://github.com/glowingjade/obsidian-smart-composer/#initial-setup',
        target: '_blank',
      },
    })

    new Setting(containerEl).setName('OpenAI API Key').addText((text) =>
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

    new Setting(containerEl).setName('Groq API Key').addText((text) =>
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

    new Setting(containerEl).setName('Anthropic API Key').addText((text) =>
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

    new Setting(containerEl).setHeading().setName('Model Settings')

    new Setting(containerEl)
      .setName('Chat Model')
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
      .setName('Apply Model')
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
      .setName('Embedding Model')
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

    new Setting(containerEl).setHeading().setName('RAG Options')

    new Setting(containerEl)
      .setName('Chunk Size')
      .setDesc(
        'Set the chunk size for text splitting. After changing this, please re-index your vault manually using the "Re-index Vault" command.',
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
      .setName('Threshold Tokens')
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
      .setName('Minimum Similarity')
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
