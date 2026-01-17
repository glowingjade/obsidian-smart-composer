import type { Server } from 'http'

import { Platform } from 'obsidian'

import {
  CODEX_AUTH_CLAIMS_URL,
  CODEX_CLIENT_ID,
  CODEX_ISSUER,
  CODEX_REDIRECT_URI,
} from '../../constants'

type CodexPkceCodes = {
  verifier: string
  challenge: string
}

type CodexTokenResponse = {
  id_token: string
  access_token: string
  refresh_token: string
  expires_in?: number
}

type CodexIdTokenClaims = {
  chatgpt_account_id?: string
  organizations?: { id: string }[]
  email?: string
  [CODEX_AUTH_CLAIMS_URL]?: {
    chatgpt_account_id?: string
  }
}

type CodexCallbackConfig = {
  hostname: string
  port: number
  path: string
  origin: string
}

const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000

let codexCallbackServer: Server | undefined
let isCodexCallbackStopping = false

export function buildCodexAuthorizeUrl(params: {
  redirectUri?: string
  pkce: CodexPkceCodes
  state: string
}): string {
  const redirectUri = params.redirectUri ?? CODEX_REDIRECT_URI
  const query = new URLSearchParams({
    response_type: 'code',
    client_id: CODEX_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'openid profile email offline_access',
    code_challenge: params.pkce.challenge,
    code_challenge_method: 'S256',
    id_token_add_organizations: 'true',
    codex_cli_simplified_flow: 'true',
    state: params.state,
    originator: 'obsidian-smart-composer',
  })
  return `${CODEX_ISSUER}/oauth/authorize?${query.toString()}`
}

export function generateCodexState(): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)).buffer)
}

export async function generateCodexPkce(): Promise<CodexPkceCodes> {
  const verifier = generateRandomString(43)
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const challenge = base64UrlEncode(hash)
  return { verifier, challenge }
}

export async function exchangeCodexCodeForTokens(params: {
  code: string
  redirectUri?: string
  pkceVerifier: string
}): Promise<CodexTokenResponse> {
  const response = await fetch(`${CODEX_ISSUER}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: params.redirectUri ?? CODEX_REDIRECT_URI,
      client_id: CODEX_CLIENT_ID,
      code_verifier: params.pkceVerifier,
    }).toString(),
  })
  if (!response.ok) {
    throw new Error(`Codex token exchange failed: ${response.status}`)
  }
  return (await response.json()) as CodexTokenResponse
}

export async function startCodexCallbackServer(params: {
  state: string
  redirectUri?: string
  timeoutMs?: number
}): Promise<string> {
  if (!Platform.isDesktop) {
    throw new Error('Codex callback server is not supported on mobile')
  }

  const { state, redirectUri, timeoutMs } = params
  const { hostname, port, path, origin } = parseCodexRedirectUri(redirectUri)

  await stopCodexCallbackServer()

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const http = require('http') as typeof import('http')

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      finalize(
        new Error('OAuth callback timeout - authorization took too long'),
      )
    }, timeoutMs ?? CALLBACK_TIMEOUT_MS)

    const server = http.createServer((req, res) => {
      const requestUrl = new URL(req.url ?? '/', origin)

      if (requestUrl.pathname !== path) {
        res.statusCode = 404
        res.end('Not found')
        return
      }

      const code = requestUrl.searchParams.get('code')
      const incomingState = requestUrl.searchParams.get('state')
      const error = requestUrl.searchParams.get('error')
      const errorDescription = requestUrl.searchParams.get('error_description')

      if (!incomingState) {
        res.statusCode = 400
        res.end('Missing state parameter')
        finalize(new Error('Missing state parameter'))
        return
      }

      if (incomingState !== state) {
        res.statusCode = 400
        res.end('Invalid state parameter')
        finalize(new Error('Invalid state parameter'))
        return
      }

      if (error) {
        const errorMsg = errorDescription ?? error
        res.statusCode = 400
        res.end(`OAuth error: ${errorMsg}`)
        finalize(new Error(errorMsg))
        return
      }

      if (!code) {
        res.statusCode = 400
        res.end('Missing authorization code')
        finalize(new Error('Missing authorization code'))
        return
      }

      res.statusCode = 200
      res.setHeader('Content-Type', 'text/html')
      res.end(
        '<!doctype html><html><head><title>Authorization Successful</title></head><body><p>You can close this window.</p><script>setTimeout(() => window.close(), 2000)</script></body></html>',
      )
      finalize(undefined, code)
    })

    const finalize = (error?: Error, code?: string) => {
      if (isCodexCallbackStopping) return
      isCodexCallbackStopping = true
      clearTimeout(timeout)
      server.close(() => {
        codexCallbackServer = undefined
        isCodexCallbackStopping = false
        if (error) {
          reject(error)
          return
        }
        if (code) {
          resolve(code)
          return
        }
        reject(new Error('OAuth callback failed'))
      })
    }

    server.on('error', (error) => {
      finalize(
        error instanceof Error
          ? error
          : new Error('OAuth callback server error'),
      )
    })

    server.listen(port, hostname, () => {
      codexCallbackServer = server
    })
  })
}

export async function stopCodexCallbackServer(): Promise<void> {
  if (!codexCallbackServer) return
  await new Promise<void>((resolve) => {
    codexCallbackServer?.close(() => resolve())
  })
  codexCallbackServer = undefined
}

export async function refreshCodexAccessToken(
  refreshToken: string,
): Promise<CodexTokenResponse> {
  const response = await fetch(`${CODEX_ISSUER}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CODEX_CLIENT_ID,
    }).toString(),
  })
  if (!response.ok) {
    throw new Error(`Codex token refresh failed: ${response.status}`)
  }
  return (await response.json()) as CodexTokenResponse
}

export function parseCodexJwtClaims(
  token: string,
): CodexIdTokenClaims | undefined {
  const parts = token.split('.')
  if (parts.length !== 3) return undefined
  try {
    const payload = decodeBase64Url(parts[1])
    return JSON.parse(payload) as CodexIdTokenClaims
  } catch {
    return undefined
  }
}

export function extractCodexAccountId(
  tokens: CodexTokenResponse,
): string | undefined {
  if (tokens.id_token) {
    const claims = parseCodexJwtClaims(tokens.id_token)
    const accountId = claims && extractAccountIdFromClaims(claims)
    if (accountId) return accountId
  }
  if (tokens.access_token) {
    const claims = parseCodexJwtClaims(tokens.access_token)
    return claims ? extractAccountIdFromClaims(claims) : undefined
  }
  return undefined
}

function extractAccountIdFromClaims(
  claims: CodexIdTokenClaims,
): string | undefined {
  return (
    claims.chatgpt_account_id ??
    claims[CODEX_AUTH_CLAIMS_URL]?.chatgpt_account_id ??
    claims.organizations?.[0]?.id
  )
}

function generateRandomString(length: number): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('')
}

function parseCodexRedirectUri(redirectUri?: string): CodexCallbackConfig {
  const url = new URL(redirectUri ?? CODEX_REDIRECT_URI)
  if (!url.port) {
    throw new Error('Codex redirect URI must include an explicit port')
  }
  const port = Number.parseInt(url.port, 10)
  return {
    hostname: url.hostname,
    port,
    path: url.pathname ?? '/',
    origin: `${url.protocol}//${url.host}`,
  }
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    '=',
  )
  return atob(padded)
}
