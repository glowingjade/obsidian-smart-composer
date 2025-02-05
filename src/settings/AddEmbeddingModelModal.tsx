import { App, Modal } from 'obsidian'
import { createRoot } from 'react-dom/client'

import AddEmbeddingModelModalRoot from '../components/settings/AddEmbeddingModelModalRoot'
import SmartComposerPlugin from '../main'

export class AddEmbeddingModelModal extends Modal {
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
    this.titleEl.setText('Add Custom Embedding Model')

    this.root = createRoot(contentEl)
    this.root.render(
      <AddEmbeddingModelModalRoot
        plugin={this.plugin}
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
