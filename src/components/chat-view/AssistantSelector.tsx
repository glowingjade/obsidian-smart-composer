import * as Popover from '@radix-ui/react-popover'
import { ChevronDown } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { useSettings } from '../../contexts/settings-context'
import { Assistant } from '../../types/assistant.types'

export function AssistantSelector() {
  const { settings, setSettings } = useSettings()
  const [open, setOpen] = useState(false)
  
  // Get assistant list and currently selected assistant
  const assistants = settings.assistants || []
  const currentAssistantId = settings.currentAssistantId
  
  // Get the current assistant object
  const currentAssistant = assistants.find(a => a.id === currentAssistantId) || 
                          (assistants.length > 0 ? assistants.find(a => a.isDefault) || assistants[0] : null)

  // When no assistant is selected but assistants are available, automatically select the default or first assistant
  useEffect(() => {
    if (!currentAssistantId && assistants.length > 0) {
      const defaultAssistant = assistants.find(a => a.isDefault) || assistants[0]
      setSettings({
        ...settings,
        currentAssistantId: defaultAssistant.id
      })
    }
  }, [currentAssistantId, assistants, settings, setSettings])

  // Handler function for selecting an assistant
  const handleSelectAssistant = async (assistant: Assistant) => {
    await setSettings({
      ...settings,
      currentAssistantId: assistant.id
    })
    setOpen(false)
  }

  // If there are no assistants, display a placeholder
  if (assistants.length === 0) {
    return (
      <div className="smtcmp-assistant-selector smtcmp-assistant-selector-empty">
        <span className="smtcmp-assistant-selector-placeholder">No assistants available</span>
      </div>
    )
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className="smtcmp-assistant-selector-button">
          <span className="smtcmp-assistant-selector-current">
            {currentAssistant ? currentAssistant.name : 'Select Assistant'}
          </span>
          <ChevronDown size={16} />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content className="smtcmp-popover smtcmp-assistant-selector-content">
          <ul className="smtcmp-assistant-selector-list">
            {assistants.map((assistant) => (
              <li
                key={assistant.id}
                className={`smtcmp-assistant-selector-item ${
                  assistant.id === currentAssistantId ? 'selected' : ''
                }`}
                onClick={() => handleSelectAssistant(assistant)}
              >
                <div className="smtcmp-assistant-selector-item-name">
                  {assistant.name}
                </div>
                {assistant.description && (
                  <div className="smtcmp-assistant-selector-item-description">
                    {assistant.description}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
