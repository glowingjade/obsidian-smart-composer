import { SmartComposerSettings } from '../../settings/schema/setting.types'

/**
 * Secrets (API keys, OAuth tokens, MCP env values) are kept out of the
 * plugin's data.json, because data.json lives inside the vault and is shared
 * with everyone who has access to it (network shares, git, cloud sync).
 * They are stored per user and per device instead.
 */

type ProviderSecret = {
  apiKey?: string
  oauth?: unknown
}

export type SecretsBlob = {
  providers: Record<string, ProviderSecret>
  mcp: Record<string, Record<string, string>>
}

export const emptySecrets = (): SecretsBlob => ({ providers: {}, mcp: {} })

export function hasSecrets(secrets: SecretsBlob): boolean {
  return (
    Object.keys(secrets.providers).length > 0 ||
    Object.keys(secrets.mcp).length > 0
  )
}

/**
 * Splits settings into a copy without any secret values, and the secrets.
 */
export function extractSecrets(settings: SmartComposerSettings): {
  sanitized: SmartComposerSettings
  secrets: SecretsBlob
} {
  const secrets = emptySecrets()

  const providers = settings.providers.map((provider) => {
    const { apiKey, ...rest } = provider
    const oauth = 'oauth' in provider ? provider.oauth : undefined
    if (apiKey || oauth) {
      secrets.providers[provider.id] = {
        ...(apiKey ? { apiKey } : {}),
        ...(oauth ? { oauth } : {}),
      }
    }
    if ('oauth' in rest) {
      const { oauth: _oauth, ...withoutOauth } = rest
      return withoutOauth
    }
    return rest
  }) as SmartComposerSettings['providers']

  const servers = settings.mcp.servers.map((server) => {
    const { env, ...parameters } = server.parameters
    if (env && Object.keys(env).length > 0) {
      secrets.mcp[server.id] = env
    }
    return { ...server, parameters }
  })

  return {
    sanitized: { ...settings, providers, mcp: { ...settings.mcp, servers } },
    secrets,
  }
}

/**
 * Inverse of extractSecrets: puts the secrets back into in-memory settings.
 */
export function applySecrets(
  settings: SmartComposerSettings,
  secrets: SecretsBlob,
): SmartComposerSettings {
  const providers = settings.providers.map((provider) => {
    const secret = secrets.providers[provider.id]
    return secret ? { ...provider, ...secret } : provider
  }) as SmartComposerSettings['providers']

  const servers = settings.mcp.servers.map((server) => {
    const env = secrets.mcp[server.id]
    return env
      ? { ...server, parameters: { ...server.parameters, env } }
      : server
  })

  return { ...settings, providers, mcp: { ...settings.mcp, servers } }
}

/**
 * Combines secrets found in a legacy (plaintext) data.json with the ones
 * already stored on this device. Device-local values win.
 */
export function mergeSecrets(
  legacy: SecretsBlob,
  local: SecretsBlob,
): SecretsBlob {
  return {
    providers: { ...legacy.providers, ...local.providers },
    mcp: { ...legacy.mcp, ...local.mcp },
  }
}
