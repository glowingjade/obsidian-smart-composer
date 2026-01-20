import { migrateFrom15To16 } from './15_to_16'

describe('Migration from v15 to v16', () => {
  it('should increment version to 16', () => {
    const oldSettings = {
      version: 15,
    }
    const result = migrateFrom15To16(oldSettings)
    expect(result.version).toBe(16)
  })

  it('should add gemini plan provider and keep custom providers', () => {
    const oldSettings = {
      version: 15,
      providers: [
        { type: 'anthropic', id: 'anthropic', apiKey: 'anthropic-key' },
        { type: 'custom', id: 'custom-provider', apiKey: 'custom-key' },
      ],
      chatModels: [],
    }

    const result = migrateFrom15To16(oldSettings)
    const providers = result.providers as { type: string; id: string }[]
    expect(providers.find((p) => p.type === 'gemini-plan')).toBeDefined()
    expect(
      providers.find((p) => p.id === 'custom-provider' && p.type === 'custom'),
    ).toBeDefined()
  })

  it('should add gemini plan chat models', () => {
    const oldSettings = {
      version: 15,
      providers: [],
      chatModels: [
        {
          id: 'custom-model',
          providerType: 'custom',
          providerId: 'custom',
          model: 'custom-model',
        },
      ],
    }

    const result = migrateFrom15To16(oldSettings)
    const chatModels = result.chatModels as {
      id: string
      providerType: string
      providerId: string
      model: string
    }[]

    const proPlan = chatModels.find(
      (m) => m.id === 'gemini-3-pro-preview (plan)',
    )
    const flashPlan = chatModels.find(
      (m) => m.id === 'gemini-3-flash-preview (plan)',
    )

    expect(proPlan).toMatchObject({
      providerType: 'gemini-plan',
      providerId: 'gemini-plan',
      model: 'gemini-3-pro-preview',
    })
    expect(flashPlan).toMatchObject({
      providerType: 'gemini-plan',
      providerId: 'gemini-plan',
      model: 'gemini-3-flash-preview',
    })
    expect(chatModels.find((m) => m.id === 'custom-model')).toBeDefined()
  })
})
