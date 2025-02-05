import { App, Modal } from 'obsidian'
import { createRoot } from 'react-dom/client'

import ProviderFormModalRoot from '../components/settings/AddProviderModalRoot'
import SmartComposerPlugin from '../main'
import { LLMProvider } from '../types/provider.types'

export class EditProviderModal extends Modal {
  private plugin: SmartComposerPlugin
  private onSubmit: () => void
  private provider: LLMProvider
  private root: ReturnType<typeof createRoot> | null = null

  constructor(
    app: App,
    plugin: SmartComposerPlugin,
    provider: LLMProvider,
    onSubmit: () => void,
  ) {
    super(app)
    this.plugin = plugin
    this.provider = provider
    this.onSubmit = onSubmit
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
        onSubmit={this.onSubmit}
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
