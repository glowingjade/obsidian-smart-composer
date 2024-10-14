import { App, PluginSettingTab, Setting } from 'obsidian'

import { APPLY_MODEL_OPTIONS, CHAT_MODEL_OPTIONS } from '../constants'
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

    new Setting(containerEl).setName('Chat Model').addDropdown((dropdown) =>
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

    new Setting(containerEl).setName('Apply Model').addDropdown((dropdown) =>
      dropdown
        .addOptions(
          APPLY_MODEL_OPTIONS.reduce<Record<string, string>>((acc, option) => {
            acc[option.value] = option.name
            return acc
          }, {}),
        )
        .setValue(this.plugin.settings.applyModel)
        .onChange(async (value) => {
          await this.plugin.setSettings({
            ...this.plugin.settings,
            applyModel: value,
          })
        }),
    )
  }
}
