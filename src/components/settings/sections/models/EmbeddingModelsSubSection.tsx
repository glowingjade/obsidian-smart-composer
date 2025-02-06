import { Trash2 } from 'lucide-react'
import { App, Notice } from 'obsidian'

import { DEFAULT_EMBEDDING_MODELS } from '../../../../constants'
import { useSettings } from '../../../../contexts/settings-context'
import { getEmbeddingModelClient } from '../../../../core/rag/embedding'
import SmartComposerPlugin from '../../../../main'
import { AddEmbeddingModelModal } from '../../../../settings/AddEmbeddingModelModal'
import { ConfirmModal } from '../../../../settings/ConfirmModal'

type EmbeddingModelsSubSectionProps = {
  app: App
  plugin: SmartComposerPlugin
}

export function EmbeddingModelsSubSection({
  app,
  plugin,
}: EmbeddingModelsSubSectionProps) {
  const { settings, setSettings } = useSettings()

  const handleDeleteEmbeddingModel = async (modelId: string) => {
    if (modelId === settings.embeddingModelId) {
      new Notice(
        'Cannot remove model that is currently selected as Embedding Model',
      )
      return
    }

    const message =
      `Are you sure you want to delete embedding model "${modelId}"?\n\n` +
      `This will also delete all embeddings generated using this model from the database.`

    new ConfirmModal(app, 'Delete Embedding Model', message, async () => {
      const vectorManager = (await plugin.getDbManager()).getVectorManager()
      const embeddingStats = await vectorManager.getEmbeddingStats()
      const embeddingStat = embeddingStats.find((v) => v.model === modelId)

      if (embeddingStat?.rowCount && embeddingStat.rowCount > 0) {
        // only clear when there's data
        const embeddingModelClient = getEmbeddingModelClient({
          settings,
          embeddingModelId: modelId,
        })
        await vectorManager.clearAllVectors(embeddingModelClient)
      }

      await setSettings({
        ...settings,
        embeddingModels: [...settings.embeddingModels].filter(
          (v) => v.id !== modelId,
        ),
      })
    }).open()
  }

  return (
    <div>
      <div className="smtcmp-settings-sub-header">Embedding Models</div>
      <div className="smtcmp-settings-desc">
        Models used for generating embeddings for RAG
      </div>

      <div className="smtcmp-settings-table-container">
        <table className="smtcmp-settings-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Provider ID</th>
              <th>Model</th>
              <th>Dimension</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {settings.embeddingModels.map((embeddingModel) => (
              <tr key={embeddingModel.id}>
                <td>{embeddingModel.id}</td>
                <td>{embeddingModel.providerId}</td>
                <td>{embeddingModel.model}</td>
                <td>{embeddingModel.dimension}</td>
                <td>
                  <div className="smtcmp-settings-actions">
                    {!DEFAULT_EMBEDDING_MODELS.some(
                      (v) => v.id === embeddingModel.id,
                    ) && (
                      <button
                        onClick={() =>
                          handleDeleteEmbeddingModel(embeddingModel.id)
                        }
                      >
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
              <td colSpan={5}>
                <button
                  onClick={() => {
                    new AddEmbeddingModelModal(app, plugin).open()
                  }}
                >
                  Add custom model
                </button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
