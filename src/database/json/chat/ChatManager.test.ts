import { App } from 'obsidian'

import { ChatManager } from './ChatManager'
import { CHAT_SCHEMA_VERSION, ChatConversation } from './types'

const mockAdapter = {
  exists: jest.fn().mockResolvedValue(true),
  mkdir: jest.fn().mockResolvedValue(undefined),
  read: jest.fn().mockResolvedValue(''),
  write: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  list: jest.fn().mockResolvedValue({ files: [], folders: [] }),
}

const mockVault = {
  adapter: mockAdapter,
}

const mockApp = {
  vault: mockVault,
} as unknown as App

describe('ChatManager', () => {
  let chatManager: ChatManager

  beforeEach(() => {
    chatManager = new ChatManager(mockApp)
  })

  describe('filename generation and parsing roundtrip', () => {
    const testTitles = [
      'Simple Title',
      'Special & Characters! #$%^',
      'Unicode 中文 日本語 한국어',
      'Extremely long title that might cause issues with file systems',
      'Title with trailing spaces   ',
      '   Title with leading spaces',
      'Title with _ underscores_and_special_chars',
      'Title with.dots.and-dashes',
      'Title with / slashes \\ and \\ backslashes',
      'Title with "quotes" and \'apostrophes\'',
      'Title with <html> tags',
      'Title with newlines\nand\ttabs',
      '🔥 Title with emojis 🚀',
      ' ',
      'Title-with-123e4567-e89b-12d3-a456-426614174000-uuid-like-substring',
      '_Title_starting_with_underscore',
      'Title+with+plus+signs',
      'Title%20with%20encoded%20characters',
      'Title ending with .json',
      'v1_Title_starting_like_a_versioned_file',
      '..Title with leading dots',
      'Title with trailing dots..',
    ]

    test.each(testTitles)('should correctly roundtrip title: %s', (title) => {
      const chat: ChatConversation = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title,
        messages: [],
        createdAt: 1620000000000,
        updatedAt: 1620000000000,
        schemaVersion: CHAT_SCHEMA_VERSION,
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fileName = (chatManager as any).generateFileName(chat)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metadata = (chatManager as any).parseFileName(fileName)

      expect(metadata).not.toBeNull()
      if (metadata) {
        expect(metadata.id).toBe(chat.id)
        expect(metadata.title).toBe(chat.title)
        expect(metadata.updatedAt).toBe(chat.updatedAt)
        expect(metadata.schemaVersion).toBe(chat.schemaVersion)
      }
    })
  })
})
