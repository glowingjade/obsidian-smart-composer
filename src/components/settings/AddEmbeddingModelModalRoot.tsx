import { Notice } from 'obsidian'
import { useState } from 'react'

import { DEFAULT_PROVIDERS, PROVIDER_TYPES_INFO } from '../../constants'
import { getProviderClient } from '../../core/llm/manager'
import { supportedDimensionsForIndex } from '../../database/schema'
import SmartComposerPlugin from '../../main'
import { ConfirmModal } from '../../settings/ConfirmModal'
import {
  EmbeddingModel,
  embeddingModelSchema,
} from '../../types/embedding-model.types'
import { ObsidianButton } from '../common/ObsidianButton'
import { ObsidianDropdown } from '../common/ObsidianDropdown'
import { ObsidianSetting } from '../common/ObsidianSetting'
import { ObsidianTextInput } from '../common/ObsidianTextInput'

type AddEmbeddingModelModalRootProps = {
  plugin: SmartComposerPlugin
  onClose: () => void
}

export default function AddEmbeddingModelModalRoot({
  plugin,
  onClose,
}: AddEmbeddingModelModalRootProps) {
  const [formData, setFormData] = useState<Omit<EmbeddingModel, 'dimension'>>({
    providerId: DEFAULT_PROVIDERS[0].id,
    providerType: DEFAULT_PROVIDERS[0].type,
    id: '',
    model: '',
  })

  const handleSubmit = async () => {
    try {
      if (plugin.settings.embeddingModels.some((p) => p.id === formData.id)) {
        throw new Error(
          'Model with this ID already exists. Try a different ID.',
        )
      }

      if (
        !plugin.settings.providers.some(
          (provider) => provider.id === formData.providerId,
        )
      ) {
        throw new Error('Provider with this ID does not exist')
      }

      const providerClient = getProviderClient({
        settings: plugin.settings,
        providerId: formData.providerId,
      })

      const embeddingResult = await providerClient.getEmbedding(
        formData.model,
        'test',
      )

      if (!Array.isArray(embeddingResult) || embeddingResult.length === 0) {
        throw new Error('Embedding model returned an invalid result')
      }

      const dimension = embeddingResult.length

      if (!supportedDimensionsForIndex.includes(dimension)) {
        const confirmed = await new Promise<boolean>((resolve) => {
          new ConfirmModal(
            plugin.app,
            'Performance Warning',
            `This model outputs ${dimension} dimensions, but the optimized dimensions for database indexing are: ${supportedDimensionsForIndex.join(
              ', ',
            )}.\n\nThis may result in slower search performance.\n\nDo you want to continue anyway?`,
            () => resolve(true),
            () => resolve(false),
          ).open()
        })

        if (!confirmed) {
          return
        }
      }

      const embeddingModel: EmbeddingModel = {
        ...formData,
        dimension,
      }

      const validationResult = embeddingModelSchema.safeParse(embeddingModel)

      if (!validationResult.success) {
        throw new Error(
          validationResult.error.issues.map((v) => v.message).join('\n'),
        )
      }

      await plugin.setSettings({
        ...plugin.settings,
        embeddingModels: [...plugin.settings.embeddingModels, embeddingModel],
      })

      onClose()
    } catch (error) {
      new Notice(
        error instanceof Error ? error.message : 'An unknown error occurred',
      )
    }
  }

  return (
    <>
      <ObsidianSetting
        name="ID"
        desc="Choose an ID to identify this model in your settings. This is just for your reference."
        required
      >
        <ObsidianTextInput
          value={formData.id}
          placeholder="my-custom-embedding-model"
          onChange={(value: string) =>
            setFormData((prev) => ({ ...prev, id: value }))
          }
        />
      </ObsidianSetting>

      <ObsidianSetting name="Provider ID" required>
        <ObsidianDropdown
          value={formData.providerId}
          options={Object.fromEntries(
            plugin.settings.providers
              .filter(
                (provider) =>
                  PROVIDER_TYPES_INFO[provider.type].supportEmbedding,
              )
              .map((provider) => [provider.id, provider.id]),
          )}
          onChange={(value: string) => {
            const provider = plugin.settings.providers.find(
              (p) => p.id === value,
            )
            if (!provider) {
              new Notice(`Provider with ID ${value} not found`)
              return
            }
            setFormData((prev) => ({
              ...prev,
              providerId: value,
              providerType: provider.type,
            }))
          }}
        />
      </ObsidianSetting>

      <ObsidianSetting name="Model Name" required>
        <ObsidianTextInput
          value={formData.model}
          placeholder="Enter the model name"
          onChange={(value: string) =>
            setFormData((prev) => ({ ...prev, model: value }))
          }
        />
      </ObsidianSetting>

      <ObsidianSetting>
        <ObsidianButton text="Add" onClick={handleSubmit} cta />
        <ObsidianButton text="Cancel" onClick={onClose} />
      </ObsidianSetting>
    </>
  )
}
