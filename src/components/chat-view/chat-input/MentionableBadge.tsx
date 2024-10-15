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
}: PropsWithChildren<{
  onDelete: () => void
}>) {
  return (
    <div className="smtcmp-chat-user-input-file-badge">
      {children}
      <div
        className="smtcmp-chat-user-input-file-badge-delete"
        onClick={onDelete}
      >
        <X size={10} />
      </div>
    </div>
  )
}

function FileBadge({
  mentionable,
  onDelete,
}: {
  mentionable: MentionableFile
  onDelete: () => void
}) {
  return (
    <BadgeBase onDelete={onDelete}>
      <div className="smtcmp-chat-user-input-file-badge-name">
        <span>{mentionable.file.name}</span>
      </div>
    </BadgeBase>
  )
}

function CurrentFileBadge({
  mentionable,
  onDelete,
}: {
  mentionable: MentionableCurrentFile
  onDelete: () => void
}) {
  return mentionable.file ? (
    <BadgeBase onDelete={onDelete}>
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
}: {
  mentionable: MentionableBlock
  onDelete: () => void
}) {
  return (
    <BadgeBase onDelete={onDelete}>
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
}: {
  mentionable: Mentionable
  onDelete: () => void
}) {
  switch (mentionable.type) {
    case 'file':
      return <FileBadge mentionable={mentionable} onDelete={onDelete} />
    case 'current-file':
      return <CurrentFileBadge mentionable={mentionable} onDelete={onDelete} />
    case 'block':
      return <BlockBadge mentionable={mentionable} onDelete={onDelete} />
  }
}
