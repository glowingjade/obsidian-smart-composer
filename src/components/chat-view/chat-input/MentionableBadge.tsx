import * as HoverCard from '@radix-ui/react-hover-card'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { MarkdownView } from 'obsidian'
import { PropsWithChildren } from 'react'

import { useApp } from '../../../contexts/app-context'
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
  const app = useApp()
  const { data: fileContent } = useQuery({
    queryKey: ['file', mentionable.file.path],
    queryFn: () => app.vault.cachedRead(mentionable.file),
  })

  const handleClick = () => {
    const existingLeaf = app.workspace
      .getLeavesOfType('markdown')
      .find(
        (leaf) =>
          leaf.view instanceof MarkdownView &&
          leaf.view.file?.path === mentionable.file.path,
      )

    if (existingLeaf) {
      app.workspace.setActiveLeaf(existingLeaf, { focus: true })
    } else {
      const leaf = app.workspace.getLeaf('tab')
      leaf.openFile(mentionable.file)
    }
  }

  return (
    <HoverCard.Root>
      <HoverCard.Trigger onClick={handleClick}>
        <BadgeBase onDelete={onDelete}>
          <div className="smtcmp-chat-user-input-file-badge-name">
            <span>{mentionable.file.name}</span>
          </div>
        </BadgeBase>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content className="smtcmp-chat-mentionable-hover-content">
          {fileContent}
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  )
}

function CurrentFileBadge({
  mentionable,
  onDelete,
}: {
  mentionable: MentionableCurrentFile
  onDelete: () => void
}) {
  const app = useApp()
  const { data: fileContent } = useQuery({
    queryKey: ['file', mentionable.file?.path],
    queryFn: () =>
      mentionable.file ? app.vault.cachedRead(mentionable?.file) : null,
  })

  return mentionable.file ? (
    <HoverCard.Root>
      <HoverCard.Trigger>
        <BadgeBase onDelete={onDelete}>
          <div className="smtcmp-chat-user-input-file-badge-name">
            <span>{`${mentionable.file.name}`}</span>
          </div>
          <div className="smtcmp-chat-user-input-file-badge-name-block-suffix">
            {' (Current File)'}
          </div>
        </BadgeBase>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content className="smtcmp-chat-mentionable-hover-content">
          {fileContent}
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
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
