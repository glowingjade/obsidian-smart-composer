// src/components/settings/sections/ChatSection.tsx

import {
  RECOMMENDED_MODELS_FOR_APPLY,
  RECOMMENDED_MODELS_FOR_CHAT,
} from '../../../constants'
import { useSettings } from '../../../contexts/settings-context'
import { ObsidianDropdown } from '../../common/ObsidianDropdown'
import { ObsidianSetting } from '../../common/ObsidianSetting'
import { ObsidianTextArea } from '../../common/ObsidianTextArea'
import { ObsidianTextInput } from '../../common/ObsidianTextInput'
import { ObsidianToggle } from '../../common/ObsidianToggle'

export function ChatSection() {
  const { settings, setSettings } = useSettings()

  const handleDepthChange = (
    value: string,
    field: 'forwardLinkDepth' | 'backwardLinkDepth' | 'activeFileForwardLinkDepth' | 'activeFileBackwardLinkDepth'
  ) => {
    const depth = parseInt(value, 10);
    const inputEl = document.querySelector(`[data-field-name="${field}"]`) as HTMLInputElement;

    if (!isNaN(depth) && depth >= 0 && depth <= 5) {
      setSettings({
        ...settings,
        chatOptions: {
          ...settings.chatOptions,
          [field]: depth,
        },
      });
      if (inputEl) inputEl.style.borderColor = 'var(--background-modifier-border)';
    } else {
      if (inputEl) inputEl.style.borderColor = 'var(--text-error)';
    }
  };

  return (
    <div className="smtcmp-settings-section">
      <div className="smtcmp-settings-header">Chat</div>

      <ObsidianSetting
        name="Chat model"
        desc="Choose the model you want to use for chat."
      >
        <ObsidianDropdown
          value={settings.chatModelId}
          options={Object.fromEntries(
            settings.chatModels
              .filter(({ enable }) => enable ?? true)
              .map((chatModel) => [
                chatModel.id,
                `${chatModel.id}${RECOMMENDED_MODELS_FOR_CHAT.includes(chatModel.id) ? ' (Recommended)' : ''}`,
              ]),
          )}
          onChange={async (value) => {
            await setSettings({
              ...settings,
              chatModelId: value,
            })
          }}
        />
      </ObsidianSetting>

      <ObsidianSetting
        name="Apply model"
        desc="Choose the model you want to use for apply feature."
      >
        <ObsidianDropdown
          value={settings.applyModelId}
          options={Object.fromEntries(
            settings.chatModels
              .filter(({ enable }) => enable ?? true)
              .map((chatModel) => [
                chatModel.id,
                `${chatModel.id}${RECOMMENDED_MODELS_FOR_APPLY.includes(chatModel.id) ? ' (Recommended)' : ''}`,
              ]),
          )}
          onChange={async (value) => {
            await setSettings({
              ...settings,
              applyModelId: value,
            })
          }}
        />
      </ObsidianSetting>

      <ObsidianSetting
        name="System prompt"
        desc="This prompt will be added to the beginning of every chat."
        className="smtcmp-settings-textarea-header"
      />

      <ObsidianSetting className="smtcmp-settings-textarea">
        <ObsidianTextArea
          value={settings.systemPrompt}
          onChange={async (value: string) => {
            await setSettings({
              ...settings,
              systemPrompt: value,
            })
          }}
        />
      </ObsidianSetting>

      <ObsidianSetting
        name="Include current file"
        desc="Automatically include the content of your current file in chats."
      >
        <ObsidianToggle
          value={settings.chatOptions.includeCurrentFileContent}
          onChange={async (value) => {
            await setSettings({
              ...settings,
              chatOptions: {
                ...settings.chatOptions,
                includeCurrentFileContent: value,
              },
            })
          }}
        />
      </ObsidianSetting>

      {settings.chatOptions.includeCurrentFileContent && (
        <>
          <ObsidianSetting
            name="Active file forward link depth"
            desc="Default forward link depth for the active file (0-5)."
          >
            <ObsidianTextInput
              value={String(settings.chatOptions.activeFileForwardLinkDepth)}
              onChange={(value) => handleDepthChange(value, 'activeFileForwardLinkDepth')}
              inputAttrs={{ "data-field-name": "activeFileForwardLinkDepth" }}
            />
          </ObsidianSetting>
          <ObsidianSetting
            name="Active file backward link depth"
            desc="Default backward link depth for the active file (0-5)."
          >
            <ObsidianTextInput
              value={String(settings.chatOptions.activeFileBackwardLinkDepth)}
              onChange={(value) => handleDepthChange(value, 'activeFileBackwardLinkDepth')}
              inputAttrs={{ "data-field-name": "activeFileBackwardLinkDepth" }}
            />
          </ObsidianSetting>
        </>
      )}

      <ObsidianSetting
        name="Enable tools"
        desc="Allow the AI to use MCP tools."
      >
        <ObsidianToggle
          value={settings.chatOptions.enableTools}
          onChange={async (value) => {
            await setSettings({
              ...settings,
              chatOptions: {
                ...settings.chatOptions,
                enableTools: value,
              },
            })
          }}
        />
      </ObsidianSetting>

      <ObsidianSetting
        name="Max auto tool requests"
        desc="Maximum number of consecutive tool calls that can be made automatically without user confirmation. Higher values can significantly increase costs as each tool call consumes additional tokens."
      >
        <ObsidianTextInput
          value={settings.chatOptions.maxAutoIterations.toString()}
          onChange={async (value) => {
            const parsedValue = parseInt(value)
            if (isNaN(parsedValue) || parsedValue < 1) {
              return
            }
            await setSettings({
              ...settings,
              chatOptions: {
                ...settings.chatOptions,
                maxAutoIterations: parsedValue,
              },
            })
          }}
        />
      </ObsidianSetting>

      <ObsidianSetting
        name="Enable forward links"
        desc="Automatically include notes linked from your mentioned files."
      >
        <ObsidianToggle
          value={settings.chatOptions.enableForwardLinks}
          onChange={async (value) => {
            await setSettings({
              ...settings,
              chatOptions: {
                ...settings.chatOptions,
                enableForwardLinks: value,
              },
            })
          }}
        />
      </ObsidianSetting>
      
      {settings.chatOptions.enableForwardLinks && (
          <ObsidianSetting
            name="Forward link depth"
            desc="How many links deep to follow forward links (0-5)."
          >
            <ObsidianTextInput
              value={String(settings.chatOptions.forwardLinkDepth)}
              onChange={(value) => handleDepthChange(value, 'forwardLinkDepth')}
              inputAttrs={{ "data-field-name": "forwardLinkDepth" }}
            />
          </ObsidianSetting>
      )}

      <ObsidianSetting
        name="Enable backward links"
        desc="Automatically include notes that link to your mentioned files."
      >
        <ObsidianToggle
          value={settings.chatOptions.enableBackwardLinks}
          onChange={async (value) => {
            await setSettings({
              ...settings,
              chatOptions: {
                ...settings.chatOptions,
                enableBackwardLinks: value,
              },
            })
          }}
        />
      </ObsidianSetting>
      
      {settings.chatOptions.enableBackwardLinks && (
          <ObsidianSetting
            name="Backward link depth"
            desc="How many links deep to follow backward links (0-5)."
          >
            <ObsidianTextInput
              value={String(settings.chatOptions.backwardLinkDepth)}
              onChange={(value) => handleDepthChange(value, 'backwardLinkDepth')}
              inputAttrs={{ "data-field-name": "backwardLinkDepth" }}
            />
          </ObsidianSetting>
      )}
    </div>
  )
}