import { App, Notice } from 'obsidian'
import { useEffect, useState } from 'react'

import { PROVIDER_TYPES_INFO } from '../../../constants'
import {
  buildGeminiAuthorizeUrl,
  exchangeGeminiCodeForTokens,
  generateGeminiPkce,
  generateGeminiState,
  startGeminiCallbackServer,
  stopGeminiCallbackServer,
} from '../../../core/llm/geminiAuth'
import SmartComposerPlugin from '../../../main'
import { ObsidianButton } from '../../common/ObsidianButton'
import { ObsidianSetting } from '../../common/ObsidianSetting'
import { ObsidianTextInput } from '../../common/ObsidianTextInput'
import { ReactModal } from '../../common/ReactModal'

type ConnectGeminiPlanModalProps = {
  plugin: SmartComposerPlugin
  onClose: () => void
}

const GEMINI_PLAN_PROVIDER_ID = PROVIDER_TYPES_INFO['gemini-plan']
  .defaultProviderId as string

export class ConnectGeminiPlanModal extends ReactModal<ConnectGeminiPlanModalProps> {
  constructor(app: App, plugin: SmartComposerPlugin) {
    super({
      app: app,
      Component: ConnectGeminiPlanModalComponent,
      props: { plugin },
      options: {
        title: 'Connect Google AI subscription',
      },
    })
  }
}

function ConnectGeminiPlanModalComponent({
  plugin,
  onClose,
}: ConnectGeminiPlanModalProps) {
  const extractParamFromRedirectUrl = (input: string, key: string) => {
    const trimmed = input.trim()
    if (!trimmed) return ''
    try {
      const parsed = new URL(trimmed)
      return parsed.searchParams.get(key) ?? ''
    } catch {
      const match = trimmed.match(new RegExp(`[?&]${key}=([^&]+)`))
      if (match?.[1]) return decodeURIComponent(match[1])
      return ''
    }
  }
  const extractCodeFromRedirectUrl = (input: string) =>
    extractParamFromRedirectUrl(input, 'code')
  const extractStateFromRedirectUrl = (input: string) =>
    extractParamFromRedirectUrl(input, 'state')

  const [authorizeUrl, setAuthorizeUrl] = useState('')
  const [redirectUrl, setRedirectUrl] = useState('')
  const [pkceVerifier, setPkceVerifier] = useState('')
  const [state, setState] = useState('')
  const [isWaitingForCallback, setIsWaitingForCallback] = useState(false)
  const [isManualConnecting, setIsManualConnecting] = useState(false)
  const [autoError, setAutoError] = useState('')
  const [manualError, setManualError] = useState('')

  const redirectCode = extractCodeFromRedirectUrl(redirectUrl)
  const redirectState = extractStateFromRedirectUrl(redirectUrl)
  const isBusy = isWaitingForCallback || isManualConnecting

  useEffect(() => {
    return () => {
      void stopGeminiCallbackServer()
    }
  }, [])

  const applyTokens = async (
    tokens: Awaited<ReturnType<typeof exchangeGeminiCodeForTokens>>,
  ) => {
    if (
      !plugin.settings.providers.find(
        (p) => p.type === 'gemini-plan' && p.id === GEMINI_PLAN_PROVIDER_ID,
      )
    ) {
      throw new Error('Gemini Plan provider not found.')
    }
    await plugin.setSettings({
      ...plugin.settings,
      providers: plugin.settings.providers.map((p) => {
        if (p.type === 'gemini-plan' && p.id === GEMINI_PLAN_PROVIDER_ID) {
          return {
            ...p,
            oauth: {
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              expiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000,
              email: tokens.email,
            },
          }
        }
        return p
      }),
    })
  }

  const ensureAuthContext = async () => {
    if (authorizeUrl && pkceVerifier && state) return
    const pkce = await generateGeminiPkce()
    const newState = generateGeminiState()
    const url = buildGeminiAuthorizeUrl({ pkce, state: newState })
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
      const callbackCode = await startGeminiCallbackServer({
        state: effectiveState,
      })
      const tokens = await exchangeGeminiCodeForTokens({
        code: callbackCode,
        pkceVerifier: effectivePkceVerifier,
      })
      await applyTokens(tokens)
      new Notice('Gemini Plan connected')
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

    if (!redirectState) {
      setManualError(
        'No OAuth state found. Paste the full redirect URL from your browser address bar.',
      )
      return
    }

    setManualError('')
    setIsManualConnecting(true)

    try {
      const hasRedirectState = Boolean(redirectState)
      const ensured = hasRedirectState ? undefined : await ensureAuthContext()
      const effectivePkceVerifier = ensured?.pkceVerifier ?? pkceVerifier
      const effectiveState = redirectState ?? ensured?.state ?? state
      if (!effectivePkceVerifier) {
        setManualError(
          'Click "Login to Google" first, then paste the redirect URL.',
        )
        return
      }
      if (!effectiveState) {
        new Notice('Failed to initialize OAuth flow')
        return
      }
      if (redirectState && state && redirectState !== state) {
        setManualError(
          'OAuth state mismatch. Start login again and paste the newest redirect URL.',
        )
        return
      }
      const tokens = await exchangeGeminiCodeForTokens({
        code: redirectCode,
        pkceVerifier: effectivePkceVerifier,
      })
      await applyTokens(tokens)
      new Notice('Gemini Plan connected')
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
          <li>Login to Google in your browser</li>
          <li>Smart Composer connects automatically when you return</li>
          <li>
            If automatic connect fails, paste the full redirect URL below and
            click &quot;Connect with URL&quot;
          </li>
        </ol>
      </div>

      <ObsidianSetting
        name="Gemini login"
        desc="Login to Google in your browser. Smart Composer connects automatically when you return."
      >
        <ObsidianButton
          text="Login to Google"
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
            placeholder="http://localhost:8085/oauth2callback?code=..."
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
