import * as Tooltip from '@radix-ui/react-tooltip'
import {
  ArrowBigUp,
  ChevronUp,
  Command,
  CornerDownLeftIcon,
} from 'lucide-react'
import { Platform } from 'obsidian'

export function VaultChatButton({ onClick }: { onClick: () => void }) {
  return (
    <>
      <Tooltip.Provider delayDuration={0}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              className="smtcmp-chat-user-input-submit-button"
              onClick={onClick}
            >
              <div className="smtcmp-chat-user-input-submit-button-icons">
                {Platform.isMacOS ? (
                  <Command size={10} />
                ) : (
                  <ChevronUp size={12} />
                )}
                {/* TODO: Replace with a custom icon */}
                <ArrowBigUp size={12} />
                <CornerDownLeftIcon size={12} />
              </div>
              <div>Vault Chat</div>
            </button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content className="smtcmp-tooltip-content" sideOffset={5}>
              Chat with your entire vault
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    </>
  )
}
