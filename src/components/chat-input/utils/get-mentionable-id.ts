import {
  Mentionable,
  MentionableBlock,
  MentionableFile,
} from '../../../types/mentionable'

export function generateMentionableId(
  mentionable: Omit<Mentionable, 'id'>,
): string {
  switch (mentionable.type) {
    case 'file':
      return (mentionable as MentionableFile).file.path
    case 'current-file':
      return 'current-file'
    case 'block':
      return `${(mentionable as MentionableBlock).file.path}:${(mentionable as MentionableBlock).startLine}:${(mentionable as MentionableBlock).endLine}`
  }
}
