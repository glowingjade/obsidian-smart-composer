import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

import { useSettings } from '../../../contexts/settings-context'
import { AssistantLevel } from '../../../types/assistant-level.types'

export function AssistantLevelSelect() {
  const { settings, setSettings } = useSettings()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger className="smtcmp-chat-input-model-select">
        <div className="smtcmp-chat-input-model-select__model-name">
          {AssistantLevel[settings.assistantLevel]
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .toLowerCase()
            .replace(' and ', ' & ')}
        </div>
        <div className="smtcmp-chat-input-model-select__icon">
          {isOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </div>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className="smtcmp-popover">
          <ul>
            {Object.entries(AssistantLevel)
              .filter(([key]) => isNaN(Number(key)))
              .map(([key, value]) => (
                <DropdownMenu.Item
                  key={value}
                  onSelect={() => {
                    setSettings({
                      ...settings,
                      assistantLevel: value as AssistantLevel,
                    })
                  }}
                  asChild
                >
                  <li>
                    {key
                      .replace(/([A-Z])/g, ' $1')
                      .trim()
                      .toLowerCase()
                      .replace(' and ', ' & ')}
                  </li>
                </DropdownMenu.Item>
              ))}
          </ul>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
