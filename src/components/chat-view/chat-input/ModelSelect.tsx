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
        {
          CHAT_MODEL_OPTIONS.find((model) => model.value === settings.chatModel)
            ?.name
        }
        {isOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className="smtcmp-popover">
          <ul>
            {CHAT_MODEL_OPTIONS.map((model) => (
              <DropdownMenu.Item
                key={model.value}
                onSelect={() => {
                  setSettings({
                    ...settings,
                    chatModel: model.value,
                  })
                }}
                asChild
              >
                <li>{model.name}</li>
              </DropdownMenu.Item>
            ))}
          </ul>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
