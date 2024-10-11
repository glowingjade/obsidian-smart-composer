import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Trash2 } from 'lucide-react'

import { ChatConversationMeta } from '../types/chat'

export function ChatListDropdown({
  chatList,
  onSelectConversation,
  onDeleteConversation,
  className,
  children,
}: {
  chatList: ChatConversationMeta[]
  onSelectConversation: (conversationId: string) => void
  onDeleteConversation: (conversationId: string) => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className={className}>{children}</button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className="smtcmp-chat-list-dropdown-content smtcmp-typeahead-popover">
          <ul>
            {chatList.length === 0 ? (
              <li
                style={{
                  background: 'transparent',
                  cursor: 'default',
                  color: 'var(--text-faint)',
                }}
              >
                No conversations
              </li>
            ) : (
              chatList.map((chat) => (
                <li key={chat.id}>
                  <DropdownMenu.Item
                    onSelect={() => onSelectConversation(chat.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                    }}
                  >
                    <div>{chat.title}</div>
                    <div
                      onClick={(e) => {
                        e.stopPropagation() // Prevent the dropdown from closing
                        onDeleteConversation(chat.id)
                      }}
                      className={`smtcmp-chat-list-dropdown-item-delete`} // TODO: Add style for selected item
                    >
                      <Trash2 size={14} />
                    </div>
                  </DropdownMenu.Item>
                </li>
              ))
            )}
          </ul>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
