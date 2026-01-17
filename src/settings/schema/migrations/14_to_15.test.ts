import { migrateFrom14To15 } from './14_to_15'

describe('Migration from v14 to v15', () => {
  it('should increment version to 15', () => {
    const oldSettings = {
      version: 14,
    }
    const result = migrateFrom14To15(oldSettings)
    expect(result.version).toBe(15)
  })

  it('should add openai-codex provider', () => {
    const oldSettings = {
      version: 14,
      providers: [
        { type: 'openai', id: 'openai', apiKey: 'openai-key' },
        { type: 'anthropic', id: 'anthropic', apiKey: 'anthropic-key' },
      ],
      chatModels: [],
    }

    const result = migrateFrom14To15(oldSettings)
    const providers = result.providers as { type: string; id: string }[]
    expect(providers.find((p) => p.type === 'openai-codex')).toBeDefined()
  })
})
