import { App } from 'obsidian'

import { TemplateManager } from './TemplateManager'
import { TEMPLATE_SCHEMA_VERSION, Template } from './types'

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

describe('TemplateManager', () => {
  let templateManager: TemplateManager

  beforeEach(() => {
    templateManager = new TemplateManager(mockApp)
  })

  describe('filename generation and parsing roundtrip', () => {
    const testNames = [
      'Simple Name',
      'Special & Characters! #$%^',
      'Unicode 中文 日本語 한국어',
      'Extremely long name that might cause issues with file systems',
      'Name with trailing spaces   ',
      '   Name with leading spaces',
      'Name with _ underscores_and_special_chars',
      'Name with.dots.and-dashes',
      'Name with / slashes \\ and \\ backslashes',
      'Name with "quotes" and \'apostrophes\'',
      'Name with <html> tags',
      'Name with newlines\nand\ttabs',
      '🔥 Name with emojis 🚀',
      ' ',
      'Name-with-123e4567-e89b-12d3-a456-426614174000-uuid-like-substring',
      '_Name_starting_with_underscore',
      'Name+with+plus+signs',
      'Name%20with%20encoded%20characters',
      'Name ending with .json',
      'v1_Name_starting_like_a_versioned_file',
      '..Name with leading dots',
      'Name with trailing dots..',
    ]

    test.each(testNames)('should correctly roundtrip name: %s', (name) => {
      const template: Template = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name,
        content: { nodes: [] },
        createdAt: 1620000000000,
        updatedAt: 1620000000000,
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
      }

      const fileName = (
        templateManager as unknown as {
          generateFileName: (template: Template) => string
        }
      ).generateFileName(template)
      const metadata = (
        templateManager as unknown as {
          parseFileName: (
            fileName: string,
          ) => { id: string; name: string; schemaVersion: number } | null
        }
      ).parseFileName(fileName)

      expect(metadata).not.toBeNull()
      if (metadata) {
        expect(metadata.id).toBe(template.id)
        expect(metadata.name).toBe(template.name)
        expect(metadata.schemaVersion).toBe(template.schemaVersion)
      }
    })
  })
})
