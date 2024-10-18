import { App } from 'obsidian'

import { Mentionable, SerializedMentionable } from '../types/mentionable'

export const serializeMentionable = (
  mentionable: Mentionable,
): SerializedMentionable => {
  switch (mentionable.type) {
    case 'file':
      return {
        type: 'file',
        file: mentionable.file.path,
      }
    case 'current-file':
      return {
        type: 'current-file',
        file: mentionable.file?.path ?? null,
      }
    case 'block':
      return {
        type: 'block',
        content: mentionable.content,
        file: mentionable.file.path,
        startLine: mentionable.startLine,
        endLine: mentionable.endLine,
      }
  }
}

export const deserializeMentionable = (
  mentionable: SerializedMentionable,
  app: App,
): Mentionable | null => {
  try {
    switch (mentionable.type) {
      case 'file': {
        const file = app.vault.getFileByPath(mentionable.file)
        if (!file) {
          return null
        }
        return {
          type: 'file',
          file: file,
        }
      }
      case 'current-file': {
        if (!mentionable.file) {
          return {
            type: 'current-file',
            file: null,
          }
        }
        const file = app.vault.getFileByPath(mentionable.file)
        return {
          type: 'current-file',
          file: file,
        }
      }
      case 'block': {
        const file = app.vault.getFileByPath(mentionable.file)
        if (!file) {
          return null
        }
        return {
          type: 'block',
          content: mentionable.content,
          file: file,
          startLine: mentionable.startLine,
          endLine: mentionable.endLine,
        }
      }
    }
  } catch (e) {
    console.error('Error deserializing mentionable', e)
    return null
  }
}

export function getMentionableKey(mentionable: SerializedMentionable): string {
  switch (mentionable.type) {
    case 'file':
      return `file:${mentionable.file}`
    case 'current-file':
      return `current-file:${mentionable.file ?? 'current'}`
    case 'block':
      return `block:${mentionable.file}:${mentionable.startLine}:${mentionable.endLine}:${mentionable.content}`
  }
}

export function getMentionableName(mentionable: Mentionable): string {
  switch (mentionable.type) {
    case 'file':
      return mentionable.file.name
    case 'current-file':
      return mentionable.file?.name ?? 'Current File'
    case 'block':
      return `${mentionable.file.name} (${mentionable.startLine}:${mentionable.endLine})`
  }
}
