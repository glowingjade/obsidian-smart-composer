import * as Popover from '@radix-ui/react-popover'
import { Pencil, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

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
      maxLength={100}
    />
  )
}

function ChatListItem({
  title,
  isFocused,
  isEditing,
  onMouseEnter,
  onSelect,
  onDelete,
  onStartEdit,
  onFinishEdit,
}: {
  title: string
  isFocused: boolean
  isEditing: boolean
  onMouseEnter: () => void
  onSelect: () => Promise<void>
  onDelete: () => Promise<void>
  onStartEdit: () => void
  onFinishEdit: (title: string) => Promise<void>
}) {
  const itemRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (isFocused && itemRef.current) {
      itemRef.current.scrollIntoView({
        block: 'nearest',
      })
    }
  }, [isFocused])

  return (
    <li
      ref={itemRef}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      className={isFocused ? 'selected' : ''}
    >
      {isEditing ? (
        <TitleInput title={title} onSubmit={onFinishEdit} />
      ) : (
        <div className="smtcmp-chat-list-dropdown-item-title">{title}</div>
      )}
      <div className="smtcmp-chat-list-dropdown-item-actions">
        <div
          onClick={(e) => {
            e.stopPropagation()
            onStartEdit()
          }}
          className="smtcmp-chat-list-dropdown-item-icon"
        >
          <Pencil size={14} />
        </div>
        <div
          onClick={async (e) => {
            e.stopPropagation()
            await onDelete()
          }}
          className="smtcmp-chat-list-dropdown-item-icon"
        >
          <Trash2 size={14} />
        </div>
      </div>
    </li>
  )
}

export function ChatListDropdown({
  chatList,
  currentConversationId,
  onSelect,
  onDelete,
  onUpdateTitle,
  className,
  children,
}: {
  chatList: ChatConversationMeta[]
  currentConversationId: string
  onSelect: (conversationId: string) => Promise<void>
  onDelete: (conversationId: string) => Promise<void>
  onUpdateTitle: (conversationId: string, newTitle: string) => Promise<void>
  className?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState<number>(0)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      const currentIndex = chatList.findIndex(
        (chat) => chat.id === currentConversationId,
      )
      setFocusedIndex(currentIndex === -1 ? 0 : currentIndex)
      setEditingId(null)
    }
  }, [open])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        setFocusedIndex(Math.max(0, focusedIndex - 1))
      } else if (e.key === 'ArrowDown') {
        setFocusedIndex(Math.min(chatList.length - 1, focusedIndex + 1))
      } else if (e.key === 'Enter') {
        onSelect(chatList[focusedIndex].id)
        setOpen(false)
      }
    },
    [chatList, focusedIndex, setFocusedIndex, onSelect],
  )

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className={className}>{children}</button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="smtcmp-popover smtcmp-chat-list-dropdown-content"
          onKeyDown={handleKeyDown}
        >
          <ul>
            {chatList.length === 0 ? (
              <li className="smtcmp-chat-list-dropdown-empty">
                No conversations
              </li>
            ) : (
              chatList.map((chat, index) => (
                <ChatListItem
                  key={chat.id}
                  title={chat.title}
                  isFocused={focusedIndex === index}
                  isEditing={editingId === chat.id}
                  onMouseEnter={() => {
                    setFocusedIndex(index)
                  }}
                  onSelect={async () => {
                    await onSelect(chat.id)
                    setOpen(false)
                  }}
                  onDelete={async () => {
                    await onDelete(chat.id)
                  }}
                  onStartEdit={() => {
                    setEditingId(chat.id)
                  }}
                  onFinishEdit={async (title) => {
                    await onUpdateTitle(chat.id, title)
                    setEditingId(null)
                  }}
                />
              ))
            )}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
