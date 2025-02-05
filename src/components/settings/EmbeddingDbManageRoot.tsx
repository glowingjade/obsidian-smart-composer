import * as Tooltip from '@radix-ui/react-tooltip'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { Loader2, PickaxeIcon, RefreshCw, Trash2 } from 'lucide-react'
import { Notice } from 'obsidian'
import { useState } from 'react'

import { useDatabase } from '../../contexts/database-context'
import { useSettings } from '../../contexts/settings-context'
import { getEmbeddingModelClient } from '../../core/rag/embedding'
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
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useQuery<EmbeddingDbStats[]>({
    queryKey: ['embedding-db-stats'],
    queryFn: async () => {
      const dbStats = await (await getVectorManager()).getEmbeddingStats()

      const statsMap = new Map(dbStats.map((stat) => [stat.model, stat]))

      return settings.embeddingModels.map((embeddingModel) => ({
        model: embeddingModel.id,
        rowCount: statsMap.get(embeddingModel.id)?.rowCount ?? 0,
        totalDataBytes: statsMap.get(embeddingModel.id)?.totalDataBytes ?? 0,
      }))
    },
  })

  const handleRebuildIndex = async (modelId: string) => {
    try {
      const embeddingModel = getEmbeddingModelClient({
        settings,
        embeddingModelId: modelId,
      })

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
      const embeddingModel = getEmbeddingModelClient({
        settings,
        embeddingModelId: modelId,
      })
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
      <div className="smtcmp-settings-embedding-db-manage-header">
        <Tooltip.Provider delayDuration={0}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="smtcmp-settings-embedding-db-manage-refresh"
              >
                <RefreshCw size={16} className={isFetching ? 'spinner' : ''} />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal container={contentEl}>
              <Tooltip.Content className="smtcmp-tooltip-content">
                Refresh
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>

        <span className="smtcmp-settings-embedding-db-manage-last-updated">
          Last updated: {dayjs(dataUpdatedAt).format('YYYY-MM-DD HH:mm:ss')}
        </span>
      </div>
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
                    {Math.round(
                      ((indexProgressMap.get(stat.model)?.completedChunks ??
                        0) /
                        (indexProgressMap.get(stat.model)?.totalChunks ?? 1)) *
                        100,
                    )}
                    %
                  </div>
                </td>
              ) : (
                <td className="smtcmp-settings-embedding-db-manage-actions">
                  <Tooltip.Provider delayDuration={0}>
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <button onClick={() => handleRebuildIndex(stat.model)}>
                          <PickaxeIcon size={16} />
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
