import { App, Modal } from 'obsidian'
import { createRoot } from 'react-dom/client'

import ProviderFormModalRoot from '../components/settings/ProviderFormModalRoot'
import SmartComposerPlugin from '../main'

export class AddProviderModal extends Modal {
  private plugin: SmartComposerPlugin
  private onSubmit: () => void
  private root: ReturnType<typeof createRoot> | null = null

  constructor(app: App, plugin: SmartComposerPlugin, onSubmit: () => void) {
    super(app)
    this.plugin = plugin
    this.onSubmit = onSubmit
  }

  onOpen() {
    const { contentEl } = this
    contentEl.empty()
    this.titleEl.setText('Add Custom Provider')

    this.root = createRoot(contentEl)
    this.root.render(
      <ProviderFormModalRoot
        plugin={this.plugin}
        provider={null}
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
