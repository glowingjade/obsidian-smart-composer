import { App, Modal } from 'obsidian'
import { createRoot } from 'react-dom/client'

import { SettingsProvider } from '../../contexts/settings-context'
import SmartComposerPlugin from '../../main'
import { McpSection } from '../settings/sections/McpSection'

export class McpSectionModal extends Modal {
  private plugin: SmartComposerPlugin
  private root: ReturnType<typeof createRoot> | null = null

  constructor(app: App, plugin: SmartComposerPlugin) {
    super(app)
    this.plugin = plugin
    this.modalEl.style.width = '720px'
  }

  onOpen() {
    const { contentEl } = this
    contentEl.empty()

    this.root = createRoot(contentEl)
    this.root.render(
      <SettingsProvider
        settings={this.plugin.settings}
        setSettings={(newSettings) => this.plugin.setSettings(newSettings)}
        addSettingsChangeListener={(listener) =>
          this.plugin.addSettingsChangeListener(listener)
        }
      >
        <McpSection app={this.app} plugin={this.plugin} />
      </SettingsProvider>,
    )
  }

  onClose() {
    if (this.root) {
      this.root.unmount()
      this.root = null
    }
    const { contentEl } = this
    contentEl.empty()
  }
}
