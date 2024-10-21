import * as Tooltip from '@radix-ui/react-tooltip'
import { ArrowBigUp, Command, CornerDownLeftIcon } from 'lucide-react'

export function VaultRagButton() {
  return (
    <>
      <Tooltip.Provider delayDuration={0}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button className="smtcmp-chat-user-input-vault-rag-button">
              <span>
                <Command size={10} />
                <ArrowBigUp size={10} />
                <CornerDownLeftIcon size={10} />
              </span>
              Vault
            </button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content className="smtcmp-tooltip-content" sideOffset={5}>
              Analyze full document
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    </>
  )
}
