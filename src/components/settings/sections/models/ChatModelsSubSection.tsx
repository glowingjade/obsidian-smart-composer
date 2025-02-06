import { Trash2 } from 'lucide-react'
import { App, Notice } from 'obsidian'

import { DEFAULT_CHAT_MODELS } from '../../../../constants'
import { useSettings } from '../../../../contexts/settings-context'
import SmartComposerPlugin from '../../../../main'
import { AddChatModelModal } from '../../../../settings/AddChatModelModal'

type ChatModelsSubSectionProps = {
  app: App
  plugin: SmartComposerPlugin
}

export function ChatModelsSubSection({
  app,
  plugin,
}: ChatModelsSubSectionProps) {
  const { settings, setSettings } = useSettings()

  const handleDeleteChatModel = async (modelId: string) => {
    if (modelId === settings.chatModelId || modelId === settings.applyModelId) {
      new Notice(
        'Cannot remove model that is currently selected as Chat Model or Apply Model',
      )
      return
    }

    await setSettings({
      ...settings,
      chatModels: [...settings.chatModels].filter((v) => v.id !== modelId),
    })
  }

  return (
    <div>
      <div className="smtcmp-settings-sub-header">Chat Models</div>
      <div className="smtcmp-settings-desc">Models used for chat and apply</div>

      <table className="smtcmp-settings-model-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Provider ID</th>
            <th>Model</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {settings.chatModels.map((chatModel) => (
            <tr key={chatModel.id}>
              <td>{chatModel.id}</td>
              <td>{chatModel.providerId}</td>
              <td>{chatModel.model}</td>
              <td>
                <div className="smtcmp-settings-model-actions">
                  {!DEFAULT_CHAT_MODELS.some((v) => v.id === chatModel.id) && (
                    <button onClick={() => handleDeleteChatModel(chatModel.id)}>
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
                  new AddChatModelModal(app, plugin).open()
                }}
              >
                Add custom model
              </button>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
