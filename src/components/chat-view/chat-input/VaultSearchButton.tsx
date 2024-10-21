import * as Tooltip from '@radix-ui/react-tooltip'
import {
  ArrowBigUp,
  ChevronUp,
  Command,
  CornerDownLeftIcon,
} from 'lucide-react'
import { Platform } from 'obsidian'

export function VaultSearchButton({ onClick }: { onClick: () => void }) {
  return (
    <>
      <Tooltip.Provider delayDuration={0}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              className="smtcmp-chat-user-input-vault-search-button"
              onClick={onClick}
            >
              <div className="smtcmp-chat-user-input-vault-search-button-icons">
                {Platform.isMacOS ? (
                  <Command size={10} />
                ) : (
                  <ChevronUp size={12} />
                )}
                <ArrowBigUp size={14} />
                <CornerDownLeftIcon size={10} />
              </div>
              <div>Vault Search</div>
            </button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content className="smtcmp-tooltip-content" sideOffset={5}>
              Search through your entire vault
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    </>
  )
}
