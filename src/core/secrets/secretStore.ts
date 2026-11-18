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

  load(): SecretsBlob {
    try {
      const raw = this.read()
      if (!raw) return emptySecrets()
      const parsed = JSON.parse(raw) as Partial<SecretsBlob>
      return {
        providers: parsed.providers ?? {},
        mcp: parsed.mcp ?? {},
      }
    } catch (error) {
      console.error('Failed to read secrets from local storage', error)
      return emptySecrets()
    }
  }

  save(secrets: SecretsBlob): void {
    this.write(JSON.stringify(secrets))
  }

  private read(): string | null {
    const secretStorage = this.app.secretStorage
    if (secretStorage) {
      return secretStorage.getSecret(this.storageId)
    }
    const value = this.app.loadLocalStorage?.(this.storageId)
    return typeof value === 'string' ? value : null
  }

  private write(value: string): void {
    const secretStorage = this.app.secretStorage
    if (secretStorage) {
      secretStorage.setSecret(this.storageId, value)
      return
    }
    if (!this.app.saveLocalStorage) {
      throw new Error('No private storage available for secrets')
    }
    this.app.saveLocalStorage(this.storageId, value)
  }
}
