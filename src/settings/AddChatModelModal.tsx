import { App, Modal } from 'obsidian'
import { createRoot } from 'react-dom/client'

import AddChatModelModalRoot from '../components/settings/AddChatModelModalRoot'
import SmartComposerPlugin from '../main'

export class AddChatModelModal extends Modal {
  private plugin: SmartComposerPlugin
  private root: ReturnType<typeof createRoot> | null = null

  constructor(app: App, plugin: SmartComposerPlugin) {
    super(app)
    this.plugin = plugin
  }

  onOpen() {
    const { contentEl } = this
    contentEl.empty()
    this.titleEl.setText('Add Custom Chat Model')

    this.root = createRoot(contentEl)
    this.root.render(
      <AddChatModelModalRoot
        plugin={this.plugin}
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
