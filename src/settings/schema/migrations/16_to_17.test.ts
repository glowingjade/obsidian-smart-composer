import { migrateFrom16To17 } from './16_to_17'

describe('Migration from v16 to v17', () => {
  it('should increment version to 17', () => {
    const oldSettings = {
      version: 16,
    }
    const result = migrateFrom16To17(oldSettings)
    expect(result.version).toBe(17)
  })

  it('should add litellm provider and keep custom providers', () => {
    const oldSettings = {
      version: 16,
      providers: [
        { type: 'anthropic', id: 'anthropic', apiKey: 'anthropic-key' },
        { type: 'custom', id: 'custom-provider', apiKey: 'custom-key' },
      ],
    }

    const result = migrateFrom16To17(oldSettings)
    const providers = result.providers as { type: string; id: string }[]
    expect(providers.find((p) => p.type === 'litellm')).toBeDefined()
    expect(
      providers.find((p) => p.id === 'custom-provider' && p.type === 'custom'),
    ).toBeDefined()
  })

  it('should preserve existing provider settings', () => {
    const oldSettings = {
      version: 16,
      providers: [{ type: 'anthropic', id: 'anthropic', apiKey: 'sk-test' }],
    }
    const result = migrateFrom16To17(oldSettings)
    const providers = result.providers as {
      type: string
      id: string
      apiKey?: string
    }[]
    const anthropic = providers.find((p) => p.type === 'anthropic')
    expect(anthropic?.apiKey).toBe('sk-test')
  })
})
