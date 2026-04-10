import { migrateFrom16To17 } from './16_to_17'

describe('Migration from v16 to v17', () => {
  it('should increment version to 17', () => {
    const oldSettings = { version: 16 }
    const result = migrateFrom16To17(oldSettings)
    expect(result.version).toBe(17)
  })

  it('should preserve existing settings', () => {
    const oldSettings = {
      version: 16,
      chatOptions: { includeCurrentFileContent: true, enableTools: false },
    }
    const result = migrateFrom16To17(oldSettings)
    expect(result.chatOptions).toEqual(oldSettings.chatOptions)
  })
})
