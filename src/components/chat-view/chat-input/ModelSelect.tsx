import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

import { CHAT_MODEL_OPTIONS } from '../../../constants'
import { useSettings } from '../../../contexts/settings-context'

export function ModelSelect() {
  const { settings, setSettings } = useSettings()
  const [isOpen, setIsOpen] = useState(false)
  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger className="smtcmp-chat-input-model-select">
        <div className="smtcmp-chat-input-model-select__model-name">
          {
            CHAT_MODEL_OPTIONS.find(
              (option) => option.id === settings.chatModelId,
            )?.name
          }
        </div>
        <div className="smtcmp-chat-input-model-select__icon">
          {isOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </div>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className="smtcmp-popover">
          <ul>
            {CHAT_MODEL_OPTIONS.map((option) => (
              <DropdownMenu.Item
                key={option.id}
                onSelect={() => {
                  setSettings({
                    ...settings,
                    chatModelId: option.id,
                  })
                }}
                asChild
              >
                <li>{option.name}</li>
              </DropdownMenu.Item>
            ))}
          </ul>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
