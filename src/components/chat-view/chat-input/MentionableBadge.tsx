// src/components/chat-view/chat-input/MentionableBadge.tsx

import clsx from 'clsx'
import { Eye, EyeOff, X, ArrowLeft, ArrowRight, Plus, Minus } from 'lucide-react'
import { PropsWithChildren, useCallback } from 'react'

import { useSettings } from '../../../contexts/settings-context'
import {
  Mentionable,
  MentionableBlock,
  MentionableCurrentFile,
  MentionableFile,
  MentionableFolder,
  MentionableImage,
  MentionableUrl,
  MentionableVault,
} from '../../../types/mentionable'

import { getMentionableIcon } from './utils/get-metionable-icon'

function BadgeBase({
  children,
  onDelete,
  onClick,
  isFocused,
}: PropsWithChildren<{
  onDelete: () => void
  onClick: () => void
  isFocused: boolean
}>) {
  return (
    <div
      className={`smtcmp-chat-user-input-file-badge ${isFocused ? 'smtcmp-chat-user-input-file-badge-focused' : ''}`}
      onClick={onClick}
    >
      {children}
      <div
        className="smtcmp-chat-user-input-file-badge-delete"
        onClick={(evt) => {
          evt.stopPropagation()
          onDelete()
        }}
      >
        <X size={12} />
      </div>
    </div>
  )
}

function FileBadge({
  mentionable,
  onDelete,
  onClick,
  isFocused,
  onDepthChange,
}: {
  mentionable: MentionableFile;
  onDelete: () => void;
  onClick: () => void;
  isFocused: boolean;
  onDepthChange: (forward: number, backward: number) => void;
}) {
  const Icon = getMentionableIcon(mentionable);
  const { settings } = useSettings();

  const forwardDepth = mentionable.forwardDepth ?? settings.chatOptions.forwardLinkDepth;
  const backwardDepth = mentionable.backwardDepth ?? settings.chatOptions.backwardLinkDepth;

  const handleIncrement = (type: 'f' | 'b') => {
    if (type === 'f' && forwardDepth < 5) onDepthChange(forwardDepth + 1, backwardDepth);
    if (type === 'b' && backwardDepth < 5) onDepthChange(forwardDepth, backwardDepth + 1);
  };

  const handleDecrement = (type: 'f' | 'b') => {
    if (type === 'f' && forwardDepth > 0) onDepthChange(forwardDepth - 1, backwardDepth);
    if (type === 'b' && backwardDepth > 0) onDepthChange(forwardDepth, backwardDepth - 1);
  };

  return (
    <BadgeBase onDelete={onDelete} onClick={onClick} isFocused={isFocused}>
        <div className="smtcmp-chat-user-input-file-badge-name">
            <div className="smtcmp-depth-controls compact">
                <ArrowLeft size={10} />
                <button className="clickable-icon" onClick={(e) => { e.stopPropagation(); handleDecrement('b'); }}><Minus size={10} /></button>
                <span>{backwardDepth}</span>
                <button className="clickable-icon" onClick={(e) => { e.stopPropagation(); handleIncrement('b'); }}><Plus size={10} /></button>
            </div>
            {Icon && <Icon size={12} className="smtcmp-chat-user-input-file-badge-name-icon" />}
            <span>{mentionable.file.name}</span>
             <div className="smtcmp-depth-controls compact">
                <button className="clickable-icon" onClick={(e) => { e.stopPropagation(); handleDecrement('f'); }}><Minus size={10} /></button>
                <span>{forwardDepth}</span>
                <button className="clickable-icon" onClick={(e) => { e.stopPropagation(); handleIncrement('f'); }}><Plus size={10} /></button>
                 <ArrowRight size={10} />
            </div>
        </div>
    </BadgeBase>
  );
}


function FolderBadge({
  mentionable,
  onDelete,
  onClick,
  isFocused,
}: {
  mentionable: MentionableFolder
  onDelete: () => void
  onClick: () => void
  isFocused: boolean
}) {
  const Icon = getMentionableIcon(mentionable)
  return (
    <BadgeBase onDelete={onDelete} onClick={onClick} isFocused={isFocused}>
      <div className="smtcmp-chat-user-input-file-badge-name">
        {Icon && (
          <Icon
            size={12}
            className="smtcmp-chat-user-input-file-badge-name-icon"
          />
        )}
        <span>{mentionable.folder.name}</span>
      </div>
    </BadgeBase>
  )
}

function VaultBadge({
  mentionable,
  onDelete,
  onClick,
  isFocused,
}: {
  mentionable: MentionableVault
  onDelete: () => void
  onClick: () => void
  isFocused: boolean
}) {
  const Icon = getMentionableIcon(mentionable)
  return (
    <BadgeBase onDelete={onDelete} onClick={onClick} isFocused={isFocused}>
      <div className="smtcmp-chat-user-input-file-badge-name">
        {Icon && (
          <Icon
            size={12}
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
  isFocused,
}: {
  mentionable: MentionableCurrentFile
  onDelete: () => void
  onClick: () => void
  isFocused: boolean
}) {
  const { settings, setSettings } = useSettings()

  const handleCurrentFileToggle = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation()
      setSettings({
        ...settings,
        chatOptions: {
          ...settings.chatOptions,
          includeCurrentFileContent:
            !settings.chatOptions.includeCurrentFileContent,
        },
      })
    },
    [settings, setSettings],
  )
  
    const handleDepthChange = (
    value: number,
    field: 'activeFileForwardLinkDepth' | 'activeFileBackwardLinkDepth'
  ) => {
      if(value >= 0 && value <= 5) {
          setSettings({
              ...settings,
              chatOptions: {
                  ...settings.chatOptions,
                  [field]: value
              }
          })
      }
  };

  const Icon = getMentionableIcon(mentionable)
  return mentionable.file ? (
    <BadgeBase onDelete={onDelete} onClick={onClick} isFocused={isFocused}>
      <div className="smtcmp-chat-user-input-file-badge-name">
        {Icon && (
          <Icon
            size={12}
            className="smtcmp-chat-user-input-file-badge-name-icon"
          />
        )}
        <span
          className={clsx(
            !settings.chatOptions.includeCurrentFileContent &&
              'smtcmp-excluded-content',
          )}
        >
          {mentionable.file.name}
        </span>
        <div className="smtcmp-depth-controls compact">
            <ArrowLeft size={10} />
            <button className="clickable-icon" onClick={(e) => { e.stopPropagation(); handleDepthChange(settings.chatOptions.activeFileBackwardLinkDepth - 1, 'activeFileBackwardLinkDepth'); }}><Minus size={10} /></button>
            <span>{settings.chatOptions.activeFileBackwardLinkDepth}</span>
            <button className="clickable-icon" onClick={(e) => { e.stopPropagation(); handleDepthChange(settings.chatOptions.activeFileBackwardLinkDepth + 1, 'activeFileBackwardLinkDepth'); }}><Plus size={10} /></button>
        </div>
         <div className="smtcmp-depth-controls compact">
            <button className="clickable-icon" onClick={(e) => { e.stopPropagation(); handleDepthChange(settings.chatOptions.activeFileForwardLinkDepth - 1, 'activeFileForwardLinkDepth'); }}><Minus size={10} /></button>
            <span>{settings.chatOptions.activeFileForwardLinkDepth}</span>
            <button className="clickable-icon" onClick={(e) => { e.stopPropagation(); handleDepthChange(settings.chatOptions.activeFileForwardLinkDepth + 1, 'activeFileForwardLinkDepth'); }}><Plus size={10} /></button>
            <ArrowRight size={10} />
        </div>
      </div>
      <div
        className="smtcmp-chat-user-input-file-badge-eye"
        onClick={handleCurrentFileToggle}
      >
        {settings.chatOptions.includeCurrentFileContent ? (
          <Eye size={12} />
        ) : (
          <EyeOff size={12} />
        )}
      </div>
    </BadgeBase>
  ) : null
}

function BlockBadge({
  mentionable,
  onDelete,
  onClick,
  isFocused,
}: {
  mentionable: MentionableBlock
  onDelete: () => void
  onClick: () => void
  isFocused: boolean
}) {
  const Icon = getMentionableIcon(mentionable)
  return (
    <BadgeBase onDelete={onDelete} onClick={onClick} isFocused={isFocused}>
      <div className="smtcmp-chat-user-input-file-badge-name">
        {Icon && (
          <Icon
            size={12}
            className="smtcmp-chat-user-input-file-badge-name-icon"
          />
        )}
        <span>{mentionable.file.name}</span>
      </div>
      <div className="smtcmp-chat-user-input-file-badge-name-suffix">
        {` (${mentionable.startLine}:${mentionable.endLine})`}
      </div>
    </BadgeBase>
  )
}

function UrlBadge({
  mentionable,
  onDelete,
  onClick,
  isFocused,
}: {
  mentionable: MentionableUrl
  onDelete: () => void
  onClick: () => void
  isFocused: boolean
}) {
  const Icon = getMentionableIcon(mentionable)
  return (
    <BadgeBase onDelete={onDelete} onClick={onClick} isFocused={isFocused}>
      <div className="smtcmp-chat-user-input-file-badge-name">
        {Icon && (
          <Icon
            size={12}
            className="smtcmp-chat-user-input-file-badge-name-icon"
          />
        )}
        <span>{mentionable.url}</span>
      </div>
    </BadgeBase>
  )
}

function ImageBadge({
  mentionable,
  onDelete,
  onClick,
  isFocused,
}: {
  mentionable: MentionableImage
  onDelete: () => void
  onClick: () => void
  isFocused: boolean
}) {
  const Icon = getMentionableIcon(mentionable)
  return (
    <BadgeBase onDelete={onDelete} onClick={onClick} isFocused={isFocused}>
      <div className="smtcmp-chat-user-input-file-badge-name">
        {Icon && (
          <Icon
            size={12}
            className="smtcmp-chat-user-input-file-badge-name-icon"
          />
        )}
        <span>{mentionable.name}</span>
      </div>
    </BadgeBase>
  )
}

export default function MentionableBadge({
  mentionable,
  onDelete,
  onClick,
  isFocused = false,
  onDepthChange,
}: {
  mentionable: Mentionable;
  onDelete: () => void;
  onClick: () => void;
  isFocused?: boolean;
  onDepthChange?: (forward: number, backward: number) => void;
}) {
  switch (mentionable.type) {
    case 'file':
      return (
        <FileBadge
          mentionable={mentionable as MentionableFile}
          onDelete={onDelete}
          onClick={onClick}
          isFocused={isFocused}
          onDepthChange={onDepthChange || (() => {})}
        />
      )
    case 'folder':
      return (
        <FolderBadge
          mentionable={mentionable}
          onDelete={onDelete}
          onClick={onClick}
          isFocused={isFocused}
        />
      )
    case 'vault':
      return (
        <VaultBadge
          mentionable={mentionable}
          onDelete={onDelete}
          onClick={onClick}
          isFocused={isFocused}
        />
      )
    case 'current-file':
      return (
        <CurrentFileBadge
          mentionable={mentionable}
          onDelete={onDelete}
          onClick={onClick}
          isFocused={isFocused}
        />
      )
    case 'block':
      return (
        <BlockBadge
          mentionable={mentionable}
          onDelete={onDelete}
          onClick={onClick}
          isFocused={isFocused}
        />
      )
    case 'url':
      return (
        <UrlBadge
          mentionable={mentionable}
          onDelete={onDelete}
          onClick={onClick}
          isFocused={isFocused}
        />
      )
    case 'image':
      return (
        <ImageBadge
          mentionable={mentionable}
          onDelete={onDelete}
          onClick={onClick}
          isFocused={isFocused}
        />
      )
    default:
        return null;
  }
}