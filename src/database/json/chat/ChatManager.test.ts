import { App } from 'obsidian'

import { ChatManager } from './ChatManager'
import { CHAT_SCHEMA_VERSION, ChatConversation } from './types'

// Mock path-browserify module
jest.mock('path-browserify', () => ({
  default: {
    join: (...args: string[]) => args.join('/'),
    basename: (path: string) => path.split('/').pop() || '',
  }
}))

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
    // Reset mocks before each test
    jest.clearAllMocks()
    mockAdapter.exists.mockResolvedValue(false) // Default to file not existing
    mockAdapter.list.mockResolvedValue({ files: [], folders: [] })

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
        expect(metadata.updatedAt).toBe(chat.updatedAt)
        expect(metadata.schemaVersion).toBe(chat.schemaVersion)

        // For very long titles or those with hashing, the title might be truncated
        // In such cases, we expect 'Loading...' as a placeholder
        if (title.length > 50 || encodeURIComponent(title).length > 50) {
          // Long titles should either be truncated or show 'Loading...'
          expect(metadata.title === 'Loading...' || metadata.title.length <= title.length).toBe(true)
        } else {
          // Short titles should roundtrip exactly
          expect(metadata.title).toBe(chat.title)
        }
      }
    })
  })

  describe('filename length safety', () => {
    test('should generate filenames within length limits', () => {
      const veryLongTitle = 'This is an extremely long title that would normally cause ENAMETOOLONG errors when encoded as a filename because it contains many characters including special characters like 한글 and emojis 🚀🔥 and lots of other text that makes it very very long indeed'

      const chat: ChatConversation = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: veryLongTitle,
        messages: [],
        createdAt: 1620000000000,
        updatedAt: 1620000000000,
        schemaVersion: CHAT_SCHEMA_VERSION,
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fileName = (chatManager as any).generateFileName(chat)

      // Filename should be within safe length limits
      expect(fileName.length).toBeLessThan(200)
      expect(fileName).toMatch(/^v\d+_.*_\d+_[0-9a-f-]+\.json$/)
    })

    test('should handle Korean characters that expand when encoded', () => {
      const koreanTitle = 'MoC 에서 적절한 MoC 1~2개를 추천해주고 @README.md 가이드를 참고해'

      const chat: ChatConversation = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: koreanTitle,
        messages: [],
        createdAt: 1620000000000,
        updatedAt: 1620000000000,
        schemaVersion: CHAT_SCHEMA_VERSION,
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fileName = (chatManager as any).generateFileName(chat)

      // Should be safe length despite Korean encoding expansion
      expect(fileName.length).toBeLessThan(200)
      expect(fileName).toMatch(/^v\d+_.*_\d+_[0-9a-f-]+\.json$/)
    })
  })

  describe('title validation and sanitization', () => {
    test('should sanitize overly long titles', async () => {
      const veryLongTitle = 'A'.repeat(150) // 150 characters

      const chat = await chatManager.createChat({ title: veryLongTitle })

      // Title should be truncated to max length with ellipsis
      expect(chat.title.length).toBeLessThanOrEqual(100)
      expect(chat.title.endsWith('...')).toBe(true)
    })

    test('should throw error for empty titles', async () => {
      await expect(chatManager.createChat({ title: '' })).rejects.toThrow()
      await expect(chatManager.createChat({ title: '   ' })).rejects.toThrow()
    })

    test('should trim whitespace from titles', async () => {
      const chat = await chatManager.createChat({ title: '  Test Title  ' })

      expect(chat.title).toBe('Test Title')
    })

    test('should validate titles during updates', async () => {
      // Create a chat first
      const chat = await chatManager.createChat({ title: 'Original Title' })

      // Generate the actual filename that would be created
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const actualFileName = (chatManager as any).generateFileName(chat)

      // Mock the file listing to find our chat
      // The list method returns full paths, basename extracts the filename
      mockAdapter.list.mockResolvedValue({
        files: [`.smtcmp_json_db/chats/${actualFileName}`],
        folders: []
      })

      // Mock reading the chat file
      mockAdapter.read.mockResolvedValue(JSON.stringify(chat))

      const longTitle = 'B'.repeat(150)

      const updatedChat = await chatManager.updateChat(chat.id, { title: longTitle })

      expect(updatedChat).not.toBeNull()
      if (updatedChat) {
        expect(updatedChat.title.length).toBeLessThanOrEqual(100)
        expect(updatedChat.title.endsWith('...')).toBe(true)
      }
    })
  })
})
