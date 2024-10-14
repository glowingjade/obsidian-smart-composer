import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { CHAT_MODEL_OPTIONS } from 'src/constants'
import { useSettings } from 'src/contexts/settings-context'

export function ModelSelect() {
  const { settings, setSettings } = useSettings()

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button>{settings.chatModel}</button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className="smtcmp-model-select-content smtcmp-typeahead-popover">
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
