import { Settings, Trash2 } from 'lucide-react'
import { App } from 'obsidian'
import React from 'react'

import { DEFAULT_PROVIDERS, PROVIDER_TYPES_INFO } from '../../../constants'
import { useSettings } from '../../../contexts/settings-context'
import { getEmbeddingModelClient } from '../../../core/rag/embedding'
import SmartComposerPlugin from '../../../main'
import { AddProviderModal } from '../../../settings/AddProviderModal'
import { ConfirmModal } from '../../../settings/ConfirmModal'
import { EditProviderModal } from '../../../settings/EditProviderModal'
import { LLMProvider } from '../../../types/provider.types'

type ProvidersSectionProps = {
  app: App
  plugin: SmartComposerPlugin
}

export function ProvidersSection({ app, plugin }: ProvidersSectionProps) {
  const { settings, setSettings } = useSettings()

  const handleDeleteProvider = async (provider: LLMProvider) => {
    // Get associated models
    const associatedChatModels = settings.chatModels.filter(
      (m) => m.providerId === provider.id,
    )
    const associatedEmbeddingModels = settings.embeddingModels.filter(
      (m) => m.providerId === provider.id,
    )

    const message =
      `Are you sure you want to delete provider "${provider.id}"?\n\n` +
      `This will also delete:\n` +
      `- ${associatedChatModels.length} chat model(s)\n` +
      `- ${associatedEmbeddingModels.length} embedding model(s)\n\n` +
      `All embeddings generated using the associated embedding models will also be deleted.`

    new ConfirmModal(app, 'Delete Provider', message, async () => {
      const vectorManager = (await plugin.getDbManager()).getVectorManager()
      const embeddingStats = await vectorManager.getEmbeddingStats()

      // Clear embeddings for each associated embedding model
      for (const embeddingModel of associatedEmbeddingModels) {
        const embeddingStat = embeddingStats.find(
          (v) => v.model === embeddingModel.id,
        )

        if (embeddingStat?.rowCount && embeddingStat.rowCount > 0) {
          // only clear when there's data
          const embeddingModelClient = getEmbeddingModelClient({
            settings,
            embeddingModelId: embeddingModel.id,
          })
          await vectorManager.clearAllVectors(embeddingModelClient)
        }
      }

      await setSettings({
        ...settings,
        providers: [...settings.providers].filter((v) => v.id !== provider.id),
        chatModels: [...settings.chatModels].filter(
          (v) => v.providerId !== provider.id,
        ),
        embeddingModels: [...settings.embeddingModels].filter(
          (v) => v.providerId !== provider.id,
        ),
      })
    }).open()
  }

  return (
    <div className="smtcmp-settings-section">
      <div className="smtcmp-settings-header">Providers</div>

      <div className="smtcmp-settings-desc">
        <span>Enter your API keys for the providers you want to use</span>
        <br />
        <a
          href="https://github.com/glowingjade/obsidian-smart-composer/wiki/1.2-Initial-Setup#getting-your-api-key"
          target="_blank"
          rel="noopener noreferrer"
        >
          How to obtain API keys
        </a>
      </div>

      <div className="smtcmp-settings-table-container">
        <table className="smtcmp-settings-table">
          <colgroup>
            <col />
            <col />
            <col />
            <col width={60} />
          </colgroup>
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>API Key</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {settings.providers.map((provider) => (
              <tr key={provider.id}>
                <td>{provider.id}</td>
                <td>{PROVIDER_TYPES_INFO[provider.type].label}</td>
                <td
                  className="smtcmp-settings-table-api-key"
                  onClick={() => {
                    new EditProviderModal(app, plugin, provider).open()
                  }}
                >
                  {provider.apiKey ? '••••••••' : 'Set API key'}
                </td>
                <td>
                  <div className="smtcmp-settings-actions">
                    <button
                      onClick={() => {
                        new EditProviderModal(app, plugin, provider).open()
                      }}
                    >
                      <Settings size={16} />
                    </button>
                    {!DEFAULT_PROVIDERS.some((v) => v.id === provider.id) && (
                      <button onClick={() => handleDeleteProvider(provider)}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>
                <button
                  onClick={() => {
                    new AddProviderModal(app, plugin).open()
                  }}
                >
                  Add custom provider
                </button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
