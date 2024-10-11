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
          this.plugin.settings.openAIApiKey = value
          await this.plugin.saveSettings()
        }),
    )

    new Setting(containerEl).setName('Groq API Key').addText((text) =>
      text
        .setPlaceholder('Enter your API key')
        .setValue(this.plugin.settings.groqApiKey)
        .onChange(async (value) => {
          this.plugin.settings.groqApiKey = value
          await this.plugin.saveSettings()
        }),
    )

    new Setting(containerEl).setName('Anthropic API Key').addText((text) =>
      text
        .setPlaceholder('Enter your API key')
        .setValue(this.plugin.settings.anthropicApiKey)
        .onChange(async (value) => {
          this.plugin.settings.anthropicApiKey = value
          await this.plugin.saveSettings()
        }),
    )

    new Setting(containerEl)
      .setName('Default Chat Model')
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
            this.plugin.settings.chatModel = value
            await this.plugin.saveSettings()
          }),
      )

    new Setting(containerEl)
      .setName('Default Apply Model')
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
            this.plugin.settings.applyModel = value
            await this.plugin.saveSettings()
          }),
      )
  }
}
