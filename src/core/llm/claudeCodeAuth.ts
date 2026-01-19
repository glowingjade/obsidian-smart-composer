import { Platform } from 'obsidian'

import {
  CLAUDE_CODE_AUTHORIZE_BASE_URL,
  CLAUDE_CODE_CLIENT_ID,
  CLAUDE_CODE_OAUTH_TOKEN_ENDPOINT,
  CLAUDE_CODE_REDIRECT_URI,
} from '../../constants'
import { postFormUrlEncoded } from '../../utils/llm/httpTransport'

type ClaudeCodePkceCodes = {
  verifier: string
  challenge: string
}

type ClaudeCodeTokenResponse = {
  access_token: string
  refresh_token: string
  expires_in?: number
}

export function buildClaudeCodeAuthorizeUrl(params: {
  pkce: ClaudeCodePkceCodes
  state: string
  redirectUri?: string
}): string {
  const redirectUri = params.redirectUri ?? CLAUDE_CODE_REDIRECT_URI
  const query = new URLSearchParams({
    code: 'true',
    response_type: 'code',
    client_id: CLAUDE_CODE_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'org:create_api_key user:profile user:inference',
    code_challenge: params.pkce.challenge,
    code_challenge_method: 'S256',
    state: params.state,
  })
  return `${CLAUDE_CODE_AUTHORIZE_BASE_URL}/oauth/authorize?${query.toString()}`
}

export function generateClaudeCodeState(): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)).buffer)
}

export async function generateClaudeCodePkce(): Promise<ClaudeCodePkceCodes> {
  const verifier = generateRandomString(43)
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const challenge = base64UrlEncode(hash)
  return { verifier, challenge }
}

export async function exchangeClaudeCodeForTokens(params: {
  code: string
  pkceVerifier: string
  redirectUri?: string
  state?: string
}): Promise<ClaudeCodeTokenResponse> {
  const parsed = parseAuthorizationCode(params.code, params.state)
  return postTokenRequest({
    code: parsed.code,
    state: parsed.state,
    grant_type: 'authorization_code',
    client_id: CLAUDE_CODE_CLIENT_ID,
    redirect_uri: params.redirectUri ?? CLAUDE_CODE_REDIRECT_URI,
    code_verifier: params.pkceVerifier,
  })
}

export async function refreshClaudeCodeAccessToken(
  refreshToken: string,
): Promise<ClaudeCodeTokenResponse> {
  return postTokenRequest({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CLAUDE_CODE_CLIENT_ID,
  })
}

function parseAuthorizationCode(
  code: string,
  state?: string,
): { code: string; state?: string } {
  if (code.includes('#')) {
    const [actualCode, actualState] = code.split('#')
    return {
      code: actualCode,
      state: actualState || state,
    }
  }
  return { code, state }
}

async function postTokenRequest(
  body: Record<string, string | undefined>,
): Promise<ClaudeCodeTokenResponse> {
  if (!Platform.isDesktop) {
    throw new Error('Claude Code OAuth is not supported on mobile yet')
  }
  const payload = Object.fromEntries(
    Object.entries(body).filter(([, value]) => typeof value === 'string'),
  ) as Record<string, string>
  const response = await postFormUrlEncoded<ClaudeCodeTokenResponse>(
    CLAUDE_CODE_OAUTH_TOKEN_ENDPOINT,
    payload,
  )
  return response
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
