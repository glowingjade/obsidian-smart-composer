import { SmartCopilotSettings } from '../../settings/schema/setting.types'
import { EmbeddingModelClient } from '../../types/embedding'
import { getProviderClient } from '../llm/manager'

// TODO: these logic should go into model provider implementation
export const getEmbeddingModelClient = ({
  settings,
  embeddingModelId,
}: {
  settings: SmartCopilotSettings
  embeddingModelId: string
}): EmbeddingModelClient => {
  const embeddingModel = settings.embeddingModels.find(
    (model) => model.id === embeddingModelId,
  )
  if (!embeddingModel) {
    throw new Error(`Embedding model ${embeddingModelId} not found`)
  }

  const providerClient = getProviderClient({
    settings,
    providerId: embeddingModel.providerId,
  })

  return {
    id: embeddingModel.id,
    dimension: embeddingModel.dimension,
    getEmbedding: (text: string) =>
      providerClient.getEmbedding(embeddingModel.model, text),
  }
}
