import * as Popover from '@radix-ui/react-popover'
import { Settings } from 'lucide-react'
import { useState } from 'react'

import { ChatSettings } from '../../database/json/chat/types'

export function ChatSettingsPopover({
  chatSettings,
  onChange,
}: {
  chatSettings?: ChatSettings
  onChange: (settings: ChatSettings) => void
}) {
  const [open, setOpen] = useState(false)

  const systemPrompt = chatSettings?.systemPrompt ?? ''
  const systemPromptMode = chatSettings?.systemPromptMode ?? 'append'

  const handleSystemPromptChange = (value: string) => {
    onChange({
      systemPrompt: value,
      systemPromptMode,
    })
  }

  const handleModeChange = (mode: 'append' | 'override') => {
    onChange({
      systemPrompt,
      systemPromptMode: mode,
    })
  }

  const hasCustomPrompt = systemPrompt.trim().length > 0

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className={`clickable-icon ${hasCustomPrompt ? 'smtcmp-chat-settings-active' : ''}`}
          aria-label="Chat Settings"
        >
          <Settings size={18} />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content className="smtcmp-popover smtcmp-chat-settings-content">
          <div className="smtcmp-chat-settings-section">
            <div className="smtcmp-chat-settings-label">
              System prompt
            </div>
            <div className="smtcmp-chat-settings-description">
              This prompt applies only to this chat.
            </div>
            <textarea
              className="smtcmp-chat-settings-textarea"
              value={systemPrompt}
              onChange={(e) => handleSystemPromptChange(e.target.value)}
              placeholder="Enter a system prompt for this chat..."
              rows={4}
            />
          </div>

          <div className="smtcmp-chat-settings-section">
            <div className="smtcmp-chat-settings-label">
              Mode
            </div>
            <select
              className="dropdown smtcmp-chat-settings-select"
              value={systemPromptMode}
              onChange={(e) =>
                handleModeChange(e.target.value as 'append' | 'override')
              }
            >
              <option value="append">Append to global prompt</option>
              <option value="override">Override global prompt</option>
            </select>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
