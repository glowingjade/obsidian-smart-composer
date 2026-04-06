import { migrateFrom16To17 } from './16_to_17'

describe('Migration from v16 to v17', () => {
  it('should increment version to 17', () => {
    const oldSettings = {
      version: 16,
    }

    const result = migrateFrom16To17(oldSettings)
    expect(result.version).toBe(17)
  })

  it('should preserve existing chat options and add responseLanguage', () => {
    const oldSettings = {
      version: 16,
      chatOptions: {
        includeCurrentFileContent: false,
        enableTools: false,
        maxAutoIterations: 3,
      },
    }

    const result = migrateFrom16To17(oldSettings)
    expect(result.chatOptions).toEqual({
      includeCurrentFileContent: false,
      enableTools: false,
      maxAutoIterations: 3,
      responseLanguage: 'auto',
    })
  })

  it('should keep valid responseLanguage if already present', () => {
    const oldSettings = {
      version: 16,
      chatOptions: {
        includeCurrentFileContent: true,
        enableTools: true,
        maxAutoIterations: 1,
        responseLanguage: 'ko',
      },
    }

    const result = migrateFrom16To17(oldSettings)
    expect(result.chatOptions).toEqual({
      includeCurrentFileContent: true,
      enableTools: true,
      maxAutoIterations: 1,
      responseLanguage: 'ko',
    })
  })
})
