import { SmartComposerSettings } from '../../settings/schema/setting.types'
import { parseSmartComposerSettings } from '../../settings/schema/settings'

import {
  SecretsBlob,
  applySecrets,
  emptySecrets,
  extractSecrets,
  hasSecrets,
  mergeSecrets,
} from './secrets'

function buildSettings(): SmartComposerSettings {
  const base = parseSmartComposerSettings({})
  return {
    ...base,
    providers: [
      { type: 'openai', id: 'openai', apiKey: 'sk-openai' },
      { type: 'anthropic', id: 'anthropic' },
      {
        type: 'anthropic-plan',
        id: 'anthropic-plan',
        oauth: {
          accessToken: 'access',
          refreshToken: 'refresh',
          expiresAt: 123,
        },
      },
    ],
    mcp: {
      servers: [
        {
          id: 'srv',
          parameters: { command: 'npx', args: ['x'], env: { TOKEN: 'abc' } },
          enabled: true,
          toolOptions: {},
        },
      ],
    },
  }
}

describe('secrets', () => {
  it('removes every secret value from the sanitized settings', () => {
    const { sanitized, secrets } = extractSecrets(buildSettings())
    const json = JSON.stringify(sanitized)

    expect(json).not.toContain('sk-openai')
    expect(json).not.toContain('access')
    expect(json).not.toContain('refresh')
    expect(json).not.toContain('abc')
    expect(secrets.providers.openai).toEqual({ apiKey: 'sk-openai' })
    expect(secrets.providers.anthropic).toBeUndefined()
    expect(secrets.mcp.srv).toEqual({ TOKEN: 'abc' })
  })

  it('keeps non-secret configuration', () => {
    const { sanitized } = extractSecrets(buildSettings())
    expect(sanitized.providers.map((p) => p.id)).toEqual([
      'openai',
      'anthropic',
      'anthropic-plan',
    ])
    expect(sanitized.mcp.servers[0].parameters.command).toBe('npx')
    expect(sanitized.mcp.servers[0].parameters.args).toEqual(['x'])
  })

  it('round-trips through applySecrets', () => {
    const settings = buildSettings()
    const { sanitized, secrets } = extractSecrets(settings)
    expect(applySecrets(sanitized, secrets)).toEqual(settings)
  })

  it('leaves providers without a stored secret untouched', () => {
    const { sanitized } = extractSecrets(buildSettings())
    const result = applySecrets(sanitized, emptySecrets())
    expect(result.providers[0]).not.toHaveProperty('apiKey')
  })

  it('prefers device-local secrets over legacy ones when merging', () => {
    const legacy = {
      providers: { openai: { apiKey: 'shared' }, a: { apiKey: 'a' } },
      mcp: {},
    }
    const local = { providers: { openai: { apiKey: 'mine' } }, mcp: {} }
    const merged = mergeSecrets(legacy, local)
    expect(merged.providers.openai).toEqual({ apiKey: 'mine' })
    expect(merged.providers.a).toEqual({ apiKey: 'a' })
  })

  it('keeps credentials of a provider whose id is __proto__', () => {
    const settings = buildSettings()
    settings.providers = [
      { type: 'openai', id: '__proto__', apiKey: 'sk-proto' },
    ]
    const { sanitized, secrets } = extractSecrets(settings)
    expect(hasSecrets(secrets)).toBe(true)
    expect(JSON.stringify(sanitized)).not.toContain('sk-proto')
    const restored = JSON.parse(JSON.stringify(secrets)) as SecretsBlob
    expect(applySecrets(sanitized, restored).providers[0]).toMatchObject({
      apiKey: 'sk-proto',
    })
  })

  it('merges legacy and local fields per provider', () => {
    const merged = mergeSecrets(
      { providers: { p: { oauth: { a: 1 } } }, mcp: {} },
      { providers: { p: { apiKey: 'k' } }, mcp: {} },
    )
    expect(merged.providers.p).toEqual({ oauth: { a: 1 }, apiKey: 'k' })
  })

  it('reports whether any secrets exist', () => {
    expect(hasSecrets(emptySecrets())).toBe(false)
    expect(hasSecrets(extractSecrets(buildSettings()).secrets)).toBe(true)
  })
})
