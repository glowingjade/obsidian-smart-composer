import { App, Notice } from 'obsidian'
import { useEffect, useState } from 'react'

import { PROVIDER_TYPES_INFO } from '../../../constants'
import {
  buildCodexAuthorizeUrl,
  exchangeCodexCodeForTokens,
  extractCodexAccountId,
  generateCodexPkce,
  generateCodexState,
  startCodexCallbackServer,
  stopCodexCallbackServer,
} from '../../../core/llm/codexAuth'
import SmartComposerPlugin from '../../../main'
import { LLMProvider } from '../../../types/provider.types'
import { ObsidianButton } from '../../common/ObsidianButton'
import { ObsidianSetting } from '../../common/ObsidianSetting'
import { ObsidianTextInput } from '../../common/ObsidianTextInput'
import { ReactModal } from '../../common/ReactModal'

type ConnectOpenAIPlanModalProps = {
  plugin: SmartComposerPlugin
  onClose: () => void
}

const OPENAI_PLAN_PROVIDER_ID = PROVIDER_TYPES_INFO['openai-plan']
  .defaultProviderId as string

export class ConnectOpenAIPlanModal extends ReactModal<ConnectOpenAIPlanModalProps> {
  constructor(app: App, plugin: SmartComposerPlugin) {
    super({
      app: app,
      Component: ConnectOpenAIPlanModalComponent,
      props: { plugin },
      options: {
        title: 'Connect OpenAI subscription',
      },
    })
  }
}

function ConnectOpenAIPlanModalComponent({
  plugin,
  onClose,
}: ConnectOpenAIPlanModalProps) {
  const extractCodeFromRedirectUrl = (input: string) => {
    const trimmed = input.trim()
    if (!trimmed) return ''
    try {
      const parsed = new URL(trimmed)
      return parsed.searchParams.get('code') ?? ''
    } catch {
      const match = trimmed.match(/[?&]code=([^&]+)/)
      if (match?.[1]) return decodeURIComponent(match[1])
      return ''
    }
  }

  const [authorizeUrl, setAuthorizeUrl] = useState('')
  const [redirectUrl, setRedirectUrl] = useState('')
  const [pkceVerifier, setPkceVerifier] = useState('')
  const [state, setState] = useState('')
  const [isWaitingForCallback, setIsWaitingForCallback] = useState(false)
  const [isManualConnecting, setIsManualConnecting] = useState(false)
  const [autoError, setAutoError] = useState('')
  const [manualError, setManualError] = useState('')

  const redirectCode = extractCodeFromRedirectUrl(redirectUrl)
  const isBusy = isWaitingForCallback || isManualConnecting

  useEffect(() => {
    return () => {
      void stopCodexCallbackServer()
    }
  }, [])

  const applyTokens = async (
    tokens: Awaited<ReturnType<typeof exchangeCodexCodeForTokens>>,
  ) => {
    const accountId = extractCodexAccountId(tokens)

    const updatedProvider: LLMProvider = {
      type: 'openai-plan',
      id: OPENAI_PLAN_PROVIDER_ID,
      oauth: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000,
        accountId,
      },
    }

    const providers = [...plugin.settings.providers]
    const idx = providers.findIndex(
      (p) => p.type === 'openai-plan' && p.id === OPENAI_PLAN_PROVIDER_ID,
    )
    if (idx >= 0) {
      const existing = providers[idx]
      if (existing.type === 'openai-plan') {
        providers[idx] = {
          ...existing,
          oauth: updatedProvider.oauth,
        }
      } else {
        providers[idx] = updatedProvider
      }
    } else {
      providers.push(updatedProvider)
    }

    await plugin.setSettings({
      ...plugin.settings,
      providers,
    })
  }

  const ensureAuthContext = async () => {
    if (authorizeUrl && pkceVerifier && state) return
    const pkce = await generateCodexPkce()
    const newState = generateCodexState()
    const url = buildCodexAuthorizeUrl({ pkce, state: newState })
    setPkceVerifier(pkce.verifier)
    setState(newState)
    setAuthorizeUrl(url)
    return { pkceVerifier: pkce.verifier, state: newState, authorizeUrl: url }
  }

  const openLogin = async () => {
    if (isBusy) return
    setAutoError('')
    setManualError('')

    const ensured = await ensureAuthContext()
    const effectiveAuthorizeUrl = ensured?.authorizeUrl ?? authorizeUrl
    const effectivePkceVerifier = ensured?.pkceVerifier ?? pkceVerifier
    const effectiveState = ensured?.state ?? state

    if (!effectiveAuthorizeUrl || !effectivePkceVerifier || !effectiveState) {
      new Notice('Failed to initialize OAuth flow')
      return
    }

    window.open(effectiveAuthorizeUrl, '_blank')
    setIsWaitingForCallback(true)

    try {
      const callbackCode = await startCodexCallbackServer({
        state: effectiveState,
      })
      const tokens = await exchangeCodexCodeForTokens({
        code: callbackCode,
        pkceVerifier: effectivePkceVerifier,
      })
      await applyTokens(tokens)
      new Notice('OpenAI Plan connected')
      onClose()
    } catch {
      setAutoError(
        'Automatic connect failed. Paste the full redirect URL below and click "Connect with URL".',
      )
    } finally {
      setIsWaitingForCallback(false)
    }
  }

  const connectWithRedirectUrl = async () => {
    if (isBusy) return
    setAutoError('')

    if (!redirectUrl.trim()) {
      setManualError(
        'Paste the full redirect URL from your browser address bar.',
      )
      return
    }

    if (!redirectCode) {
      setManualError(
        'No authorization code found. Paste the full redirect URL from your browser address bar.',
      )
      return
    }

    setManualError('')
    setIsManualConnecting(true)

    try {
      const ensured = await ensureAuthContext()
      const effectivePkceVerifier = ensured?.pkceVerifier ?? pkceVerifier
      if (!effectivePkceVerifier) {
        new Notice('Failed to initialize OAuth flow')
        return
      }
      const tokens = await exchangeCodexCodeForTokens({
        code: redirectCode,
        pkceVerifier: effectivePkceVerifier,
      })
      await applyTokens(tokens)
      new Notice('OpenAI Plan connected')
      onClose()
    } catch {
      setManualError(
        'Manual connect failed. Start login again and paste the newest redirect URL.',
      )
    } finally {
      setIsManualConnecting(false)
    }
  }

  return (
    <div>
      <div className="smtcmp-plan-connect-steps">
        <div className="smtcmp-plan-connect-steps-title">How it works</div>
        <ol>
          <li>Login to OpenAI in your browser</li>
          <li>Smart Composer connects automatically when you return</li>
          <li>
            If automatic connect fails, paste the full redirect URL below and
            click &quot;Connect with URL&quot;
          </li>
        </ol>
      </div>

      <ObsidianSetting
        name="OpenAI login"
        desc="Login to OpenAI in your browser. Smart Composer connects automatically when you return."
      >
        <ObsidianButton
          text="Login to OpenAI"
          disabled={isBusy}
          onClick={() => void openLogin()}
          cta
        />
        {isWaitingForCallback && (
          <div className="smtcmp-plan-connect-waiting">
            Waiting for authorization...
          </div>
        )}
      </ObsidianSetting>

      <ObsidianSetting
        name="Redirect URL (fallback)"
        desc="Use this only if automatic connect fails. Paste the full redirect URL from your browser address bar."
        className="smtcmp-plan-connect-fallback"
      >
        <div className="smtcmp-plan-connect-fallback-controls">
          {autoError && (
            <div className="smtcmp-plan-connect-error">{autoError}</div>
          )}
          <ObsidianTextInput
            value={redirectUrl}
            placeholder="http://localhost:1455/auth/..."
            onChange={(value) => {
              setRedirectUrl(value)
              if (manualError) setManualError('')
            }}
          />
          <ObsidianButton
            text="Connect with URL"
            disabled={!redirectCode || isBusy}
            onClick={() => void connectWithRedirectUrl()}
          />
          {manualError && (
            <div className="smtcmp-plan-connect-error">{manualError}</div>
          )}
        </div>
      </ObsidianSetting>

      <ObsidianSetting>
        <ObsidianButton text="Cancel" onClick={onClose} />
      </ObsidianSetting>
    </div>
  )
}

