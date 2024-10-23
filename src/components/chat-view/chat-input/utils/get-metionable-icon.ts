import { FileIcon, FolderClosedIcon, FoldersIcon } from 'lucide-react'

import { Mentionable } from '../../../../types/mentionable'

export const getMentionableIcon = (mentionable: Mentionable) => {
  switch (mentionable.type) {
    case 'file':
      return FileIcon
    case 'folder':
      return FolderClosedIcon
    case 'vault':
      return FoldersIcon
    case 'current-file':
      return FileIcon
    default:
      return null
  }
}
