import { App } from 'obsidian'

import { SecretsBlob, emptySecrets } from './secrets'

/**
 * Obsidian's SecretStorage (Obsidian 1.11.4+). Typed locally so the plugin
 * keeps building against older typings and still runs on older Obsidian.
 */
type SecretStorageLike = {
  getSecret(id: string): string | null
  setSecret(id: string, secret: string): void
}

type AppWithStorage = App & {
  secretStorage?: SecretStorageLike
  loadLocalStorage?: (key: string) => unknown
  saveLocalStorage?: (key: string, value: unknown) => void
}

const KEY_PREFIX = 'smart-composer-secrets'

function hashString(value: string): string {
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) >>> 0
  }
  return hash.toString(16)
}

/**
 * Stores all secrets as one JSON blob, private to the current user and device.
 * Uses Obsidian's SecretStorage when available, otherwise Obsidian's
 * vault-scoped local storage. Neither is written into the vault folder.
 */
export class SecretStore {
  private readonly app: AppWithStorage
  private readonly storageId: string

  constructor(app: App) {
    this.app = app as AppWithStorage
    // SecretStorage is shared across vaults, so scope the id to this vault.
    this.storageId = `${KEY_PREFIX}-${hashString(app.vault.getName())}`
  }

  /** Whether this Obsidian version offers any private storage at all. */
  isAvailable(): boolean {
    return (
      !!this.app.secretStorage ||
      (!!this.app.loadLocalStorage && !!this.app.saveLocalStorage)
    )
  }

  /**
   * Returns the stored secrets (empty if none were stored yet).
   * Throws if the store exists but cannot be read, so callers never mistake an
   * unreadable store for an empty one.
   */
  load(): SecretsBlob {
    const secretStorage = this.app.secretStorage
    const primary = secretStorage
      ? secretStorage.getSecret(this.storageId)
      : this.readLocal()
    if (primary) return parseBlob(primary)

    // Secrets saved to local storage on an older Obsidian: promote them once
    // SecretStorage is available. The local copy is removed only afterwards.
    const fallback = secretStorage ? this.readLocal() : null
    if (!secretStorage || !fallback) return emptySecrets()
    const blob = parseBlob(fallback)
    try {
      secretStorage.setSecret(this.storageId, fallback)
      if (secretStorage.getSecret(this.storageId) === fallback) {
        this.app.saveLocalStorage?.(this.storageId, null)
      }
    } catch (error) {
      console.error('Failed to move secrets into SecretStorage', error)
    }
    return blob
  }

  /** Throws if the secrets could not be persisted. */
  save(secrets: SecretsBlob): void {
    const value = JSON.stringify(secrets)
    if (this.app.secretStorage) {
      this.app.secretStorage.setSecret(this.storageId, value)
      return
    }
    if (!this.app.saveLocalStorage) {
      throw new Error('No private storage available for secrets')
    }
    this.app.saveLocalStorage(this.storageId, value)
  }

  private readLocal(): string | null {
    const value = this.app.loadLocalStorage?.(this.storageId)
    return typeof value === 'string' ? value : null
  }
}

function parseBlob(raw: string): SecretsBlob {
  const parsed = JSON.parse(raw) as Partial<SecretsBlob>
  return {
    providers: { ...emptySecrets().providers, ...parsed.providers },
    mcp: { ...emptySecrets().mcp, ...parsed.mcp },
  }
}
