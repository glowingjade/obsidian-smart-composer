import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

type SplitButtonProps = {
  primaryText: string
  menuOptions: {
    label: string
    onClick: () => void
  }[]
  onPrimaryClick: () => void
}

export function SplitButton({
  primaryText,
  menuOptions,
  onPrimaryClick,
}: SplitButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="smtcmp-split-button">
      <button onClick={onPrimaryClick} className="smtcmp-split-button-primary">
        {primaryText}
      </button>
      <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenu.Trigger
          className="smtcmp-split-button-toggle"
          aria-label="Show more options"
        >
          <ChevronDown size={16} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="smtcmp-popover">
            <ul>
              {menuOptions.map((option) => (
                <DropdownMenu.Item
                  key={option.label}
                  onSelect={option.onClick}
                  asChild
                >
                  <li>{option.label}</li>
                </DropdownMenu.Item>
              ))}
            </ul>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )
}
