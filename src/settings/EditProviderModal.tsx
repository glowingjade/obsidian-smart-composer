import { App, Modal } from 'obsidian'
import { createRoot } from 'react-dom/client'

import ProviderFormModalRoot from '../components/settings/ProviderFormModalRoot'
import SmartComposerPlugin from '../main'
import { LLMProvider } from '../types/provider.types'

export class EditProviderModal extends Modal {
  private plugin: SmartComposerPlugin
  private provider: LLMProvider
  private root: ReturnType<typeof createRoot> | null = null

  constructor(app: App, plugin: SmartComposerPlugin, provider: LLMProvider) {
    super(app)
    this.plugin = plugin
    this.provider = provider
  }

  onOpen() {
    const { contentEl } = this
    contentEl.empty()
    this.titleEl.setText(`Edit Provider: ${this.provider.id}`)

    this.root = createRoot(contentEl)
    this.root.render(
      <ProviderFormModalRoot
        plugin={this.plugin}
        provider={this.provider}
        onClose={() => this.close()}
      />,
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
