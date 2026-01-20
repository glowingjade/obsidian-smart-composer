import type { Server } from 'http'

import { Platform } from 'obsidian'

import {
  GEMINI_OAUTH_CLIENT_ID,
  GEMINI_OAUTH_CLIENT_SECRET,
  GEMINI_OAUTH_REDIRECT_URI,
  GEMINI_OAUTH_SCOPES,
} from '../../constants'
import { postFormUrlEncoded } from '../../utils/llm/httpTransport'

type GeminiPkceCodes = {
  verifier: string
  challenge: string
}

type GeminiTokenResponse = {
  access_token: string
  refresh_token: string
  expires_in?: number
}

type GeminiUserInfo = {
  email?: string
}

type GeminiCallbackConfig = {
  hostname: string
  port: number
  path: string
  origin: string
}

const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000

let geminiCallbackServer: Server | undefined
let isGeminiCallbackStopping = false

export function buildGeminiAuthorizeUrl(params: {
  pkce: GeminiPkceCodes
  state: string
  redirectUri?: string
}): string {
  const redirectUri = params.redirectUri ?? GEMINI_OAUTH_REDIRECT_URI
  const query = new URLSearchParams({
    response_type: 'code',
    client_id: GEMINI_OAUTH_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: GEMINI_OAUTH_SCOPES.join(' '),
    code_challenge: params.pkce.challenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
    state: params.state,
  })
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.search = query.toString()
  url.hash = 'smart-composer'
  return url.toString()
}

export function generateGeminiState(): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)).buffer)
}

export async function generateGeminiPkce(): Promise<GeminiPkceCodes> {
  const verifier = generateRandomString(43)
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const challenge = base64UrlEncode(hash)
  return { verifier, challenge }
}

export async function exchangeGeminiCodeForTokens(params: {
  code: string
  redirectUri?: string
  pkceVerifier: string
}): Promise<GeminiTokenResponse & { email?: string }> {
  const tokens = await postFormUrlEncoded<GeminiTokenResponse>(
    'https://oauth2.googleapis.com/token',
    {
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: params.redirectUri ?? GEMINI_OAUTH_REDIRECT_URI,
      client_id: GEMINI_OAUTH_CLIENT_ID,
      client_secret: GEMINI_OAUTH_CLIENT_SECRET,
      code_verifier: params.pkceVerifier,
    },
  )

  const email = await fetchGeminiUserEmail(tokens.access_token)
  return {
    ...tokens,
    email: email ?? undefined,
  }
}

export async function refreshGeminiAccessToken(
  refreshToken: string,
): Promise<GeminiTokenResponse> {
  return postFormUrlEncoded<GeminiTokenResponse>(
    'https://oauth2.googleapis.com/token',
    {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: GEMINI_OAUTH_CLIENT_ID,
      client_secret: GEMINI_OAUTH_CLIENT_SECRET,
    },
  )
}

export async function startGeminiCallbackServer(params: {
  state: string
  redirectUri?: string
  timeoutMs?: number
}): Promise<string> {
  if (!Platform.isDesktop) {
    throw new Error('Gemini OAuth callback server is not supported on mobile')
  }

  const { state, redirectUri, timeoutMs } = params
  const { hostname, port, path, origin } = parseGeminiRedirectUri(redirectUri)

  await stopGeminiCallbackServer()

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
      if (isGeminiCallbackStopping) return
      isGeminiCallbackStopping = true
      clearTimeout(timeout)
      server.close(() => {
        geminiCallbackServer = undefined
        isGeminiCallbackStopping = false
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
      geminiCallbackServer = server
    })
  })
}

export async function stopGeminiCallbackServer(): Promise<void> {
  if (!geminiCallbackServer) return
  await new Promise<void>((resolve) => {
    geminiCallbackServer?.close(() => resolve())
  })
  geminiCallbackServer = undefined
}

async function fetchGeminiUserEmail(
  accessToken: string,
): Promise<string | null> {
  try {
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v1/userinfo?alt=json',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    if (!response.ok) {
      return null
    }
    const payload = (await response.json()) as GeminiUserInfo
    return payload.email ?? null
  } catch {
    return null
  }
}

function parseGeminiRedirectUri(redirectUri?: string): GeminiCallbackConfig {
  const url = new URL(redirectUri ?? GEMINI_OAUTH_REDIRECT_URI)
  if (!url.port) {
    throw new Error('Gemini redirect URI must include an explicit port')
  }
  const port = Number.parseInt(url.port, 10)
  return {
    hostname: url.hostname,
    port,
    path: url.pathname ?? '/',
    origin: `${url.protocol}//${url.host}`,
  }
}

function generateRandomString(length: number): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('')
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
