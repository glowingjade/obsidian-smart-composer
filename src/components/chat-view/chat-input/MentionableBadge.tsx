import { X } from 'lucide-react'
import { PropsWithChildren } from 'react'

import {
  Mentionable,
  MentionableBlock,
  MentionableCurrentFile,
  MentionableFile,
  MentionableFolder,
  MentionableUrl,
  MentionableVault,
} from '../../../types/mentionable'

import { getMentionableIcon } from './utils/get-metionable-icon'

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
  const Icon = getMentionableIcon(mentionable)
  return (
    <BadgeBase onDelete={onDelete} onClick={onClick}>
      <div className="smtcmp-chat-user-input-file-badge-name">
        {Icon && (
          <Icon
            size={10}
            className="smtcmp-chat-user-input-file-badge-name-icon"
          />
        )}
        <span>{mentionable.file.name}</span>
      </div>
    </BadgeBase>
  )
}

function FolderBadge({
  mentionable,
  onDelete,
  onClick,
}: {
  mentionable: MentionableFolder
  onDelete: () => void
  onClick: () => void
}) {
  const Icon = getMentionableIcon(mentionable)
  return (
    <BadgeBase onDelete={onDelete} onClick={onClick}>
      {/* TODO: Update style */}
      <div className="smtcmp-chat-user-input-file-badge-name">
        {Icon && (
          <Icon
            size={10}
            className="smtcmp-chat-user-input-file-badge-name-icon"
          />
        )}
        <span>{mentionable.folder.name}</span>
      </div>
    </BadgeBase>
  )
}

function VaultBadge({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mentionable,
  onDelete,
  onClick,
}: {
  mentionable: MentionableVault
  onDelete: () => void
  onClick: () => void
}) {
  const Icon = getMentionableIcon(mentionable)
  return (
    <BadgeBase onDelete={onDelete} onClick={onClick}>
      {/* TODO: Update style */}
      <div className="smtcmp-chat-user-input-file-badge-name">
        {Icon && (
          <Icon
            size={10}
            className="smtcmp-chat-user-input-file-badge-name-icon"
          />
        )}
        <span>Vault</span>
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
  const Icon = getMentionableIcon(mentionable)
  return mentionable.file ? (
    <BadgeBase onDelete={onDelete} onClick={onClick}>
      <div className="smtcmp-chat-user-input-file-badge-name">
        {Icon && (
          <Icon
            size={10}
            className="smtcmp-chat-user-input-file-badge-name-icon"
          />
        )}
        <span>{mentionable.file.name}</span>
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
  const Icon = getMentionableIcon(mentionable)
  return (
    <BadgeBase onDelete={onDelete} onClick={onClick}>
      <div className="smtcmp-chat-user-input-file-badge-name-block-name">
        {Icon && (
          <Icon
            size={10}
            className="smtcmp-chat-user-input-file-badge-name-block-name-icon"
          />
        )}
        <span>{mentionable.file.name}</span>
      </div>
      <div className="smtcmp-chat-user-input-file-badge-name-block-suffix">
        {` (${mentionable.startLine}:${mentionable.endLine})`}
      </div>
    </BadgeBase>
  )
}

function UrlBadge({
  mentionable,
  onDelete,
  onClick,
}: {
  mentionable: MentionableUrl
  onDelete: () => void
  onClick: () => void
}) {
  const Icon = getMentionableIcon(mentionable)
  return (
    <BadgeBase onDelete={onDelete} onClick={onClick}>
      <div className="smtcmp-chat-user-input-file-badge-name">
        {Icon && (
          <Icon
            size={10}
            className="smtcmp-chat-user-input-file-badge-name-icon"
          />
        )}
        <span>{mentionable.url}</span>
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
    case 'folder':
      return (
        <FolderBadge
          mentionable={mentionable}
          onDelete={onDelete}
          onClick={onClick}
        />
      )
    case 'vault':
      return (
        <VaultBadge
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
    case 'url':
      return (
        <UrlBadge
          mentionable={mentionable}
          onDelete={onDelete}
          onClick={onClick}
        />
      )
  }
}
