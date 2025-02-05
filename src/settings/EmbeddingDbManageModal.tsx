import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App, Modal } from 'obsidian'
import { createRoot } from 'react-dom/client'

import EmbeddingDbManageRoot from '../components/settings/EmbeddingDbManageRoot'
import { AppProvider } from '../contexts/app-context'
import { DatabaseProvider } from '../contexts/database-context'
import { SettingsProvider } from '../contexts/settings-context'
import SmartComposerPlugin from '../main'

export class EmbeddingDbManageModal extends Modal {
  private plugin: SmartComposerPlugin

  constructor(app: App, plugin: SmartComposerPlugin) {
    super(app)
    this.plugin = plugin
  }

  async onOpen() {
    this.contentEl.empty()

    this.titleEl.setText(`Manage Embedding Database`)

    const root = createRoot(this.contentEl)

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          gcTime: 0, // Immediately garbage collect queries. It prevents memory leak on ChatView close.
        },
        mutations: {
          gcTime: 0, // Immediately garbage collect mutations. It prevents memory leak on ChatView close.
        },
      },
    })

    root.render(
      <AppProvider app={this.app}>
        <SettingsProvider
          settings={this.plugin.settings}
          setSettings={(newSettings) => this.plugin.setSettings(newSettings)}
          addSettingsChangeListener={(listener) =>
            this.plugin.addSettingsChangeListener(listener)
          }
        >
          <DatabaseProvider
            getDatabaseManager={() => this.plugin.getDbManager()}
          >
            <QueryClientProvider client={queryClient}>
              <EmbeddingDbManageRoot contentEl={this.contentEl} />
            </QueryClientProvider>
          </DatabaseProvider>
        </SettingsProvider>
      </AppProvider>,
    )
  }

  onClose() {
    const { contentEl } = this
    contentEl.empty()
  }
}
