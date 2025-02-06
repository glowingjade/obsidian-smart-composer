import { App, Modal } from 'obsidian'
import { createRoot } from 'react-dom/client'

import ProviderFormModalRoot from '../components/settings/ProviderFormModalRoot'
import SmartComposerPlugin from '../main'

export class AddProviderModal extends Modal {
  private plugin: SmartComposerPlugin
  private root: ReturnType<typeof createRoot> | null = null

  constructor(app: App, plugin: SmartComposerPlugin) {
    super(app)
    this.plugin = plugin
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
