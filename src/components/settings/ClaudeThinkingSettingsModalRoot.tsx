import { App, Modal, Notice } from 'obsidian'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'

import SmartComposerPlugin from '../../main'
import { ChatModel, chatModelSchema } from '../../types/chat-model.types'
import { ObsidianButton } from '../common/ObsidianButton'
import { ObsidianSetting } from '../common/ObsidianSetting'
import { ObsidianTextInput } from '../common/ObsidianTextInput'

/**
 * TODO: This is a temporary implementation specific to the thinking model.
 * Future work should implement a configurable settings system for all models.
 */

export class ClaudeThinkingSettingsModal extends Modal {
  private plugin: SmartComposerPlugin
  private model: ChatModel
  private root: ReturnType<typeof createRoot> | null = null

  constructor(app: App, plugin: SmartComposerPlugin, model: ChatModel) {
    super(app)
    this.plugin = plugin
    this.model = model
  }

  onOpen() {
    const { contentEl } = this
    contentEl.empty()
    this.titleEl.setText('Edit Chat Model: claude-3.7-sonnet-thinking')

    this.root = createRoot(contentEl)
    this.root.render(
      <ClaudeThinkingSettingsModalRoot
        plugin={this.plugin}
        model={this.model}
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

function ClaudeThinkingSettingsModalRoot({
  plugin,
  model,
  onClose,
}: {
  plugin: SmartComposerPlugin
  model: ChatModel
  onClose: () => void
}) {
  const [budgetTokens, setBudgetTokens] = useState(
    model.providerType === 'anthropic'
      ? (model.thinking?.budget_tokens ?? 0).toString()
      : '0',
  )

  const handleSubmit = async () => {
    if (model.providerType === 'anthropic') {
      const parsedTokens = parseInt(budgetTokens, 10)
      if (isNaN(parsedTokens)) {
        new Notice('Please enter a valid number')
        return
      }

      if (parsedTokens < 1024) {
        new Notice('Budget tokens must be at least 1024')
        return
      }

      const updatedModel = {
        ...model,
        thinking: { budget_tokens: parsedTokens },
      }

      const validationResult = chatModelSchema.safeParse(updatedModel)
      if (!validationResult.success) {
        new Notice(
          validationResult.error.issues.map((v) => v.message).join('\n'),
        )
        return
      }

      await plugin.setSettings({
        ...plugin.settings,
        chatModels: plugin.settings.chatModels.map((m) =>
          m.id === model.id ? updatedModel : m,
        ),
      })
      onClose()
    }
  }

  return (
    <>
      <ObsidianSetting
        name="Budget Tokens"
        desc="The maximum number of tokens that Claude can use for thinking."
        required
      >
        <ObsidianTextInput
          value={budgetTokens}
          placeholder="Number of tokens"
          onChange={(value: string) => {
            setBudgetTokens(value)
          }}
        />
      </ObsidianSetting>

      <ObsidianSetting>
        <ObsidianButton text="Save" onClick={handleSubmit} cta />
        <ObsidianButton text="Cancel" onClick={onClose} />
      </ObsidianSetting>
    </>
  )
}
