import { migrateFrom14To15 } from './14_to_15'

describe('Migration from v14 to v15', () => {
  it('should increment version to 15', () => {
    const oldSettings = {
      version: 14,
    }
    const result = migrateFrom14To15(oldSettings)
    expect(result.version).toBe(15)
  })

  it('should add oauth providers', () => {
    const oldSettings = {
      version: 14,
      providers: [
        { type: 'anthropic', id: 'anthropic', apiKey: 'anthropic-key' },
        { type: 'openai', id: 'openai', apiKey: 'openai-key' },
      ],
      chatModels: [],
    }

    const result = migrateFrom14To15(oldSettings)
    const providers = result.providers as { type: string; id: string }[]
    expect(providers.find((p) => p.type === 'anthropic-plan')).toBeDefined()
    expect(providers.find((p) => p.type === 'openai-plan')).toBeDefined()
  })
})
