import { migrateFrom14To15 } from './14_to_15'

describe('Migration from v14 to v15', () => {
  it('should increment version to 15', () => {
    const oldSettings = {
      version: 14,
    }
    const result = migrateFrom14To15(oldSettings)
    expect(result.version).toBe(15)
  })

  it('should add default plan providers and keep custom providers', () => {
    const oldSettings = {
      version: 14,
      providers: [
        { type: 'anthropic', id: 'anthropic', apiKey: 'anthropic-key' },
        { type: 'openai', id: 'openai', apiKey: 'openai-key' },
        { type: 'custom', id: 'custom-provider', apiKey: 'custom-key' },
      ],
      chatModels: [],
    }

    const result = migrateFrom14To15(oldSettings)
    const providers = result.providers as { type: string; id: string }[]
    expect(providers.find((p) => p.type === 'anthropic-plan')).toBeDefined()
    expect(providers.find((p) => p.type === 'openai-plan')).toBeDefined()
    expect(
      providers.find((p) => p.id === 'custom-provider' && p.type === 'custom'),
    ).toBeDefined()
  })

  it('should add plan chat models with expected settings', () => {
    const oldSettings = {
      version: 14,
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

    const result = migrateFrom14To15(oldSettings)
    const chatModels = result.chatModels as {
      id: string
      providerType: string
      providerId: string
      model: string
      thinking?: { enabled?: boolean; budget_tokens?: number }
    }[]

    const opusPlan = chatModels.find((m) => m.id === 'claude-opus-4.5 (plan)')
    const sonnetPlan = chatModels.find(
      (m) => m.id === 'claude-sonnet-4.5 (plan)',
    )
    const gptPlan = chatModels.find((m) => m.id === 'gpt-5.2 (plan)')

    expect(opusPlan).toMatchObject({
      providerType: 'anthropic-plan',
      providerId: 'anthropic-plan',
      model: 'claude-opus-4-5',
      thinking: { enabled: true, budget_tokens: 8192 },
    })
    expect(sonnetPlan).toMatchObject({
      providerType: 'anthropic-plan',
      providerId: 'anthropic-plan',
      model: 'claude-sonnet-4-5',
      thinking: { enabled: true, budget_tokens: 8192 },
    })
    expect(gptPlan).toMatchObject({
      providerType: 'openai-plan',
      providerId: 'openai-plan',
      model: 'gpt-5.2',
    })
    expect(chatModels.find((m) => m.id === 'custom-model')).toBeDefined()
  })
})
