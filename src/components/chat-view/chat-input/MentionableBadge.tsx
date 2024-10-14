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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'var(--background-secondary)',
        border: '1px solid var(--background-modifier-border)',
        borderRadius: 'var(--radius-s)',
        fontSize: 'var(--font-smallest)',
        padding: 'var(--size-2-1) var(--size-4-1)',
        gap: 'var(--size-2-1)',
      }}
    >
      {children}
      <div
        style={{
          cursor: 'pointer',
          display: 'flex',
          color: 'var(--text-muted)',
        }}
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
      <div
        style={{
          whiteSpace: 'nowrap',
        }}
      >
        {mentionable.file.name}
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
      <div
        style={{
          whiteSpace: 'nowrap',
        }}
      >
        {`${mentionable.file.name}`}
        <span
          style={{
            color: 'var(--text-faint)',
          }}
        >
          {' (Current File)'}
        </span>
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
      <div
        style={{
          whiteSpace: 'nowrap',
        }}
      >
        {`${mentionable.file.name}`}
        <span
          style={{
            color: 'var(--text-faint)',
          }}
        >
          {` (${mentionable.startLine}:${mentionable.endLine})`}
        </span>
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
