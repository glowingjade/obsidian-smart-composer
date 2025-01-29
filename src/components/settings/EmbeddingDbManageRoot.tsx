import * as Tooltip from '@radix-ui/react-tooltip'
import { useQuery } from '@tanstack/react-query'
import { Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { Notice } from 'obsidian'
import { useState } from 'react'

import { useDatabase } from '../../contexts/database-context'
import { useSettings } from '../../contexts/settings-context'
import { getEmbeddingModel } from '../../core/rag/embedding'
import { EmbeddingDbStats } from '../../types/embedding'
import { IndexProgress } from '../chat-view/QueryProgress'

export default function EmbeddingDbManageRoot({
  contentEl,
}: {
  contentEl: HTMLElement
}) {
  const { getVectorManager } = useDatabase()
  const { settings } = useSettings()
  const [indexProgressMap, setIndexProgressMap] = useState<
    Map<string, IndexProgress>
  >(new Map())

  const {
    data: stats = [],
    isLoading,
    refetch,
  } = useQuery<EmbeddingDbStats[]>({
    queryKey: ['embedding-db-stats'],
    queryFn: async () => {
      return (await getVectorManager()).getEmbeddingStats()
    },
  })

  const handleRebuildIndex = async (modelId: string) => {
    try {
      const embeddingModel = getEmbeddingModel(
        modelId,
        {
          openAIApiKey: settings.openAIApiKey,
          geminiApiKey: settings.geminiApiKey,
        },
        settings.ollamaEmbeddingModel.baseUrl,
      )

      await refetch()

      await (
        await getVectorManager()
      ).updateVaultIndex(
        embeddingModel,
        {
          chunkSize: settings.ragOptions.chunkSize,
          excludePatterns: settings.ragOptions.excludePatterns,
          includePatterns: settings.ragOptions.includePatterns,
          reindexAll: true,
        },
        (progress) => {
          setIndexProgressMap((prev) => {
            const newMap = new Map(prev)
            newMap.set(modelId, progress)
            return newMap
          })
        },
      )
    } catch (error) {
      console.error(error)
      new Notice('Failed to rebuild index')
    } finally {
      setIndexProgressMap((prev) => {
        const newMap = new Map(prev)
        newMap.delete(modelId)
        return newMap
      })
      await refetch()
    }
  }

  const handleRemoveIndex = async (modelId: string) => {
    try {
      const embeddingModel = getEmbeddingModel(
        modelId,
        {
          openAIApiKey: settings.openAIApiKey,
          geminiApiKey: settings.geminiApiKey,
        },
        settings.ollamaEmbeddingModel.baseUrl,
      )
      await (await getVectorManager()).clearAllVectors(embeddingModel)
    } catch (error) {
      console.error(error)
      new Notice('Failed to remove index')
    } finally {
      await refetch()
    }
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="smtcmp-settings-embedding-db-manage-root">
      <table className="smtcmp-settings-embedding-db-manage-table">
        <thead>
          <tr>
            <th>Model</th>
            <th>Total Embeddings</th>
            <th>Size (MB)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((stat) => (
            <tr key={stat.model}>
              <td>{stat.model}</td>
              <td>{stat.rowCount}</td>
              <td>{(stat.totalDataBytes / 1000 / 1000).toFixed(2)}</td>
              {indexProgressMap.get(stat.model) ? (
                <td className="smtcmp-settings-embedding-db-manage-actions-loading">
                  <Loader2 className="spinner" size={14} />
                  <div>
                    Indexing chunks:{' '}
                    {indexProgressMap.get(stat.model)?.completedChunks} /{' '}
                    {indexProgressMap.get(stat.model)?.totalChunks}
                  </div>
                </td>
              ) : (
                <td className="smtcmp-settings-embedding-db-manage-actions">
                  <Tooltip.Provider delayDuration={0}>
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <button onClick={() => handleRebuildIndex(stat.model)}>
                          <RefreshCw size={16} />
                        </button>
                      </Tooltip.Trigger>
                      <Tooltip.Portal container={contentEl}>
                        <Tooltip.Content className="smtcmp-tooltip-content">
                          Rebuild Index
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                  <Tooltip.Provider delayDuration={0}>
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <button onClick={() => handleRemoveIndex(stat.model)}>
                          <Trash2 size={16} />
                        </button>
                      </Tooltip.Trigger>
                      <Tooltip.Portal container={contentEl}>
                        <Tooltip.Content className="smtcmp-tooltip-content">
                          Remove Index
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
