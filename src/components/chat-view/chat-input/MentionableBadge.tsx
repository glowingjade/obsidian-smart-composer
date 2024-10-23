import { X } from 'lucide-react'
import { PropsWithChildren } from 'react'

import {
  Mentionable,
  MentionableBlock,
  MentionableCurrentFile,
  MentionableFile,
} from '../../../types/mentionable'

function BadgeBase({
  children,
  onDelete,
  onClick,
}: PropsWithChildren<{
  onDelete: () => void
  onClick: () => void
}>) {
  return (
    <div className="smtcmp-chat-user-input-file-badge" onClick={onClick}>
      {children}
      <div
        className="smtcmp-chat-user-input-file-badge-delete"
        onClick={(evt) => {
          evt.stopPropagation()
          onDelete()
        }}
      >
        <X size={10} />
      </div>
    </div>
  )
}

function FileBadge({
  mentionable,
  onDelete,
  onClick,
}: {
  mentionable: MentionableFile
  onDelete: () => void
  onClick: () => void
}) {
  return (
    <BadgeBase onDelete={onDelete} onClick={onClick}>
      <div className="smtcmp-chat-user-input-file-badge-name">
        <span>{mentionable.file.name}</span>
      </div>
    </BadgeBase>
  )
}

function CurrentFileBadge({
  mentionable,
  onDelete,
  onClick,
}: {
  mentionable: MentionableCurrentFile
  onDelete: () => void
  onClick: () => void
}) {
  return mentionable.file ? (
    <BadgeBase onDelete={onDelete} onClick={onClick}>
      <div className="smtcmp-chat-user-input-file-badge-name">
        <span>{`${mentionable.file.name}`}</span>
      </div>
      <div className="smtcmp-chat-user-input-file-badge-name-block-suffix">
        {' (Current File)'}
      </div>
    </BadgeBase>
  ) : null
}

function BlockBadge({
  mentionable,
  onDelete,
  onClick,
}: {
  mentionable: MentionableBlock
  onDelete: () => void
  onClick: () => void
}) {
  return (
    <BadgeBase onDelete={onDelete} onClick={onClick}>
      <div className="smtcmp-chat-user-input-file-badge-name-block-name">
        <span>{`${mentionable.file.name}`}</span>
      </div>
      <div className="smtcmp-chat-user-input-file-badge-name-block-suffix">
        {` (${mentionable.startLine}:${mentionable.endLine})`}
      </div>
    </BadgeBase>
  )
}

export default function MentionableBadge({
  mentionable,
  onDelete,
  onClick,
}: {
  mentionable: Mentionable
  onDelete: () => void
  onClick: () => void
}) {
  switch (mentionable.type) {
    case 'file':
      return (
        <FileBadge
          mentionable={mentionable}
          onDelete={onDelete}
          onClick={onClick}
        />
      )
    case 'current-file':
      return (
        <CurrentFileBadge
          mentionable={mentionable}
          onDelete={onDelete}
          onClick={onClick}
        />
      )
    case 'block':
      return (
        <BlockBadge
          mentionable={mentionable}
          onDelete={onDelete}
          onClick={onClick}
        />
      )
  }
}
