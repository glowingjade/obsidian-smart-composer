import { v4 as uuidv4 } from 'uuid'

import { TEMPLATE_SCHEMA_VERSION, Template, TemplateMetadata } from './types'

// Create a simplified test class that only implements the functions we want to test
class TestTemplateManager {
  public generateFileName(template: Template): string {
    // Format: v{schemaVersion}_name_id.json (with name encoded)
    const encodedName = encodeURIComponent(template.name)
    return `v${TEMPLATE_SCHEMA_VERSION}_${encodedName}_${template.id}.json`
  }

  public parseFileName(fileName: string): TemplateMetadata | null {
    const match = fileName.match(/^v(\d+)_(.+)_([^_]+)\.json$/)
    if (!match) return null

    const schemaVersion = parseInt(match[1], 10)
    const encodedName = match[2]
    const id = match[3]
    const name = decodeURIComponent(encodedName)

    return { id, name, schemaVersion }
  }
}

describe('TemplateManager', () => {
  let templateManager: TestTemplateManager

  beforeEach(() => {
    templateManager = new TestTemplateManager()
  })

  describe('filename pattern', () => {
    const fileNames = [
      'Simple Template',
      'Template with spaces and symbols: !@#$%^&*()',
      'Template/with/slashes',
      'Template with unicode: 你好世界',
      'Very long template name that goes on and on and on and on and on and on and on and on and on and on and on',
      ' ', // Just a space
      '.', // Just a dot
      '..', // Double dot
      'Template with trailing space ',
      ' Template with leading space',
      'Template with emoji 😀🚀💯🔥',
      'Template with control characters \n\t\r\b',
      'Template with quotes "double" and \'single\'',
      'Template with < > characters that might break XML/HTML',
      'Template with backslashes \\\\\\',
      'Template with all ASCII punctuation: `~!@#$%^&*()_+-={}[]|\\:;"\'<>,.?/',
      'CON', // Windows reserved filename
      'Template.with.multiple.dots',
    ]

    it('should correctly generate and parse filenames', () => {
      fileNames.forEach((name) => {
        const template: Template = {
          id: uuidv4(),
          name,
          content: { nodes: [] },
          createdAt: new Date(),
          updatedAt: new Date(),
          schemaVersion: TEMPLATE_SCHEMA_VERSION,
        }

        const fileName = templateManager.generateFileName(template)
        const metadata = templateManager.parseFileName(fileName)

        expect(metadata).not.toBeNull()
        expect(metadata?.id).toBe(template.id)
        expect(metadata?.name).toBe(template.name)
        expect(metadata?.schemaVersion).toBe(template.schemaVersion)
      })
    })
  })
})
