import { Notice } from 'obsidian'
import { useState } from 'react'

import { DEFAULT_PROVIDERS } from '../../constants'
import SmartComposerPlugin from '../../main'
import { ChatModel, chatModelSchema } from '../../types/chat-model.types'
import { ObsidianButton } from '../common/ObsidianButton'
import { ObsidianDropdown } from '../common/ObsidianDropdown'
import { ObsidianSetting } from '../common/ObsidianSetting'
import { ObsidianTextInput } from '../common/ObsidianTextInput'

type AddChatModelModalRootProps = {
  plugin: SmartComposerPlugin
  onClose: () => void
}

export default function AddChatModelModalRoot({
  plugin,
  onClose,
}: AddChatModelModalRootProps) {
  const [formData, setFormData] = useState<ChatModel>({
    providerId: DEFAULT_PROVIDERS[0].id,
    providerType: DEFAULT_PROVIDERS[0].type,
    id: '',
    model: '',
  })

  const handleSubmit = async () => {
    if (plugin.settings.chatModels.some((p) => p.id === formData.id)) {
      new Notice('Model with this ID already exists. Try a different ID.')
      return
    }

    if (
      !plugin.settings.providers.some(
        (provider) => provider.id === formData.providerId,
      )
    ) {
      new Notice('Provider with this ID does not exist')
      return
    }

    const validationResult = chatModelSchema.safeParse(formData)
    if (!validationResult.success) {
      new Notice(validationResult.error.issues.map((v) => v.message).join('\n'))
      return
    }

    await plugin.setSettings({
      ...plugin.settings,
      chatModels: [...plugin.settings.chatModels, formData],
    })

    onClose()
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
          placeholder="my-custom-model"
          onChange={(value: string) =>
            setFormData((prev) => ({ ...prev, id: value }))
          }
        />
      </ObsidianSetting>

      <ObsidianSetting name="Provider ID" required>
        <ObsidianDropdown
          value={formData.providerId}
          options={Object.fromEntries(
            plugin.settings.providers.map((provider) => [
              provider.id,
              provider.id,
            ]),
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
