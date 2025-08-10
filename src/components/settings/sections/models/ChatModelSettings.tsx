import { App, Notice } from 'obsidian'
import { useState } from 'react'

import SmartComposerPlugin from '../../../../main'
import { ChatModel, chatModelSchema } from '../../../../types/chat-model.types'
import { ObsidianButton } from '../../../common/ObsidianButton'
import { ObsidianDropdown } from '../../../common/ObsidianDropdown'
import { ObsidianSetting } from '../../../common/ObsidianSetting'
import { ObsidianTextInput } from '../../../common/ObsidianTextInput'
import { ObsidianToggle } from '../../../common/ObsidianToggle'
import { ReactModal } from '../../../common/ReactModal'

type SettingsComponentProps = {
  model: ChatModel
  plugin: SmartComposerPlugin
  onClose: () => void
}

export class ChatModelSettingsModal extends ReactModal<SettingsComponentProps> {
  constructor(model: ChatModel, app: App, plugin: SmartComposerPlugin) {
    const modelSettings = getModelSettings(model)
    super({
      app: app,
      Component: modelSettings
        ? modelSettings.SettingsComponent
        : () => <div>No settings available for this model</div>,
      props: { model, plugin },
      options: {
        title: `Edit Chat Model: ${model.id}`,
      },
    })
  }
}

type ModelSettingsRegistry = {
  check: (model: ChatModel) => boolean
  SettingsComponent: React.FC<SettingsComponentProps>
}

/**
 * Registry of available model settings.
 *
 * The check function is used to determine if the model settings should be displayed.
 * The SettingsComponent is the component that will be displayed when the model settings are opened.
 */
const MODEL_SETTINGS_REGISTRY: ModelSettingsRegistry[] = [
  /**
   * OpenAI model settings
   */
  {
    check: (model) => model.providerType === 'openai',

    SettingsComponent: (props: SettingsComponentProps) => {
      const { model, plugin, onClose } = props
      const typedModel = model as ChatModel & { providerType: 'openai' }
      const [reasoningEnabled, setReasoningEnabled] = useState<boolean>(
        typedModel.reasoning?.enabled ?? false,
      )
      const [reasoningEffort, setReasoningEffort] = useState<string>(
        typedModel.reasoning?.reasoning_effort ?? 'medium',
      )

      const handleSubmit = async () => {
        if (!['low', 'medium', 'high'].includes(reasoningEffort)) {
          new Notice('Reasoning effort must be one of "low", "medium", "high"')
          return
        }

        const updatedModel = {
          ...typedModel,
          reasoning: {
            enabled: reasoningEnabled,
            reasoning_effort: reasoningEffort,
          },
        }
        await plugin.setSettings({
          ...plugin.settings,
          chatModels: plugin.settings.chatModels.map((m) =>
            m.id === model.id ? updatedModel : m,
          ),
        })
        onClose()
      }

      return (
        <>
          <ObsidianSetting
            name="Reasoning"
            desc="Enable reasoning for the model. Available for o-series models (e.g., o3, o4-mini) and GPT-5 models."
          >
            <ObsidianToggle
              value={reasoningEnabled}
              onChange={(value: boolean) => setReasoningEnabled(value)}
            />
          </ObsidianSetting>
          {reasoningEnabled && (
            <ObsidianSetting
              name="Reasoning Effort"
              desc={`Controls how much thinking the model does before responding. Default is "medium".`}
              className="smtcmp-setting-item--nested"
              required
            >
              <ObsidianDropdown
                value={reasoningEffort}
                options={{
                  low: 'low',
                  medium: 'medium',
                  high: 'high',
                }}
                onChange={(value: string) => setReasoningEffort(value)}
              />
            </ObsidianSetting>
          )}

          <ObsidianSetting>
            <ObsidianButton text="Save" onClick={handleSubmit} cta />
            <ObsidianButton text="Cancel" onClick={onClose} />
          </ObsidianSetting>
        </>
      )
    },
  },

  /**
   * Claude model settings
   *
   * For extended thinking, see:
   * @see https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking
   */
  {
    check: (model) => model.providerType === 'anthropic',
    SettingsComponent: (props: SettingsComponentProps) => {
      const DEFAULT_THINKING_BUDGET_TOKENS = 8192

      const { model, plugin, onClose } = props
      const typedModel = model as ChatModel & { providerType: 'anthropic' }
      const [thinkingEnabled, setThinkingEnabled] = useState<boolean>(
        typedModel.thinking?.enabled ?? false,
      )
      const [budgetTokens, setBudgetTokens] = useState(
        (
          typedModel.thinking?.budget_tokens ?? DEFAULT_THINKING_BUDGET_TOKENS
        ).toString(),
      )

      const handleSubmit = async () => {
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
          ...typedModel,
          thinking: {
            enabled: thinkingEnabled,
            budget_tokens: parsedTokens,
          },
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

      return (
        <>
          <ObsidianSetting
            name="Extended Thinking"
            desc="Enable extended thinking for Claude. Available for Claude Sonnet 3.7+ and Claude Opus 4.0+."
          >
            <ObsidianToggle
              value={thinkingEnabled}
              onChange={(value: boolean) => setThinkingEnabled(value)}
            />
          </ObsidianSetting>
          {thinkingEnabled && (
            <ObsidianSetting
              name="Budget Tokens"
              desc="The maximum number of tokens that Claude can use for thinking. Must be at least 1024."
              className="smtcmp-setting-item--nested"
              required
            >
              <ObsidianTextInput
                value={budgetTokens}
                placeholder="Number of tokens"
                onChange={(value: string) => setBudgetTokens(value)}
                type="number"
              />
            </ObsidianSetting>
          )}

          <ObsidianSetting>
            <ObsidianButton text="Save" onClick={handleSubmit} cta />
            <ObsidianButton text="Cancel" onClick={onClose} />
          </ObsidianSetting>
        </>
      )
    },
  },

  // Perplexity settings
  {
    check: (model) =>
      model.providerType === 'perplexity' &&
      [
        'sonar',
        'sonar-pro',
        'sonar-deep-research',
        'sonar-reasoning',
        'sonar-reasoning-pro',
      ].includes(model.model),

    SettingsComponent: (props: SettingsComponentProps) => {
      const { model, plugin, onClose } = props
      const typedModel = model as ChatModel & { providerType: 'perplexity' }
      const [searchContextSize, setSearchContextSize] = useState(
        typedModel.web_search_options?.search_context_size ?? 'low',
      )

      const handleSubmit = async () => {
        if (!['low', 'medium', 'high'].includes(searchContextSize)) {
          new Notice(
            'Search context size must be one of "low", "medium", "high"',
          )
          return
        }

        const updatedModel = {
          ...typedModel,
          web_search_options: {
            ...typedModel.web_search_options,
            search_context_size: searchContextSize,
          },
        }
        await plugin.setSettings({
          ...plugin.settings,
          chatModels: plugin.settings.chatModels.map((m) =>
            m.id === model.id ? updatedModel : m,
          ),
        })
        onClose()
      }

      return (
        <>
          <ObsidianSetting
            name="Search Context Size"
            desc={`Determines how much search context is retrieved for the model. Choose "low" for minimal context and lower costs, "medium" for a balanced approach, or "high" for maximum context at higher cost. Default is "low".`}
          >
            <ObsidianDropdown
              value={searchContextSize}
              options={{
                low: 'low',
                medium: 'medium',
                high: 'high',
              }}
              onChange={(value: string) => setSearchContextSize(value)}
            />
          </ObsidianSetting>

          <ObsidianSetting>
            <ObsidianButton text="Save" onClick={handleSubmit} cta />
            <ObsidianButton text="Cancel" onClick={onClose} />
          </ObsidianSetting>
        </>
      )
    },
  },
]

function getModelSettings(model: ChatModel): ModelSettingsRegistry | undefined {
  return MODEL_SETTINGS_REGISTRY.find((registry) => registry.check(model))
}

export function hasChatModelSettings(model: ChatModel): boolean {
  return !!getModelSettings(model)
}
