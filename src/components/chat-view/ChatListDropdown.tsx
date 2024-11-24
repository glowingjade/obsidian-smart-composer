import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Pencil, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { ChatConversationMeta } from '../../types/chat'

function TitleInput({
  title,
  onSubmit,
}: {
  title: string
  onSubmit: (title: string) => Promise<void>
}) {
  const [value, setValue] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.select()
      inputRef.current.scrollLeft = 0
    }
  }, [])

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      className="smtcmp-chat-list-dropdown-item-title-input"
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') {
          onSubmit(value)
        }
      }}
      autoFocus
    />
  )
}

export function ChatListDropdown({
  chatList,
  onSelectConversation,
  onDeleteConversation,
  onEditTitle,
  className,
  children,
}: {
  chatList: ChatConversationMeta[]
  onSelectConversation: (conversationId: string) => Promise<void>
  onDeleteConversation: (conversationId: string) => Promise<void>
  onEditTitle: (conversationId: string, newTitle: string) => Promise<void>
  className?: string
  children: React.ReactNode
}) {
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <DropdownMenu.Root
      onOpenChange={(open) => {
        if (!open) {
          setEditingId(null)
        }
      }}
    >
      <DropdownMenu.Trigger asChild>
        <button className={className}>{children}</button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className="smtcmp-popover smtcmp-chat-list-dropdown-content">
          <ul>
            {chatList.length === 0 ? (
              <li className="smtcmp-chat-list-dropdown-empty">
                No conversations
              </li>
            ) : (
              chatList.map((chat) => (
                <DropdownMenu.Item
                  onSelect={async () => {
                    setEditingId(null)
                    await onSelectConversation(chat.id)
                  }}
                  asChild
                  key={chat.id}
                >
                  <li>
                    {editingId === chat.id ? (
                      <TitleInput
                        title={chat.title}
                        onSubmit={async (newTitle) => {
                          await onEditTitle(chat.id, newTitle)
                          setEditingId(null)
                        }}
                      />
                    ) : (
                      <div className="smtcmp-chat-list-dropdown-item-title">
                        {chat.title}
                      </div>
                    )}
                    <div className="smtcmp-chat-list-dropdown-item-actions">
                      <div
                        onClick={(e) => {
                          e.stopPropagation() // Prevent the dropdown from closing
                          setEditingId(chat.id)
                        }}
                        className="smtcmp-chat-list-dropdown-item-icon"
                      >
                        <Pencil size={14} />
                      </div>
                      <div
                        onClick={async (e) => {
                          e.stopPropagation() // Prevent the dropdown from closing
                          await onDeleteConversation(chat.id)
                        }}
                        className="smtcmp-chat-list-dropdown-item-icon"
                      >
                        <Trash2 size={14} />
                      </div>
                    </div>
                  </li>
                </DropdownMenu.Item>
              ))
            )}
          </ul>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
