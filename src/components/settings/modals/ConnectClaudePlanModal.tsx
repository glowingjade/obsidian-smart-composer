import { App, Notice } from 'obsidian'
import { useEffect, useState } from 'react'

import { PROVIDER_TYPES_INFO } from '../../../constants'
import {
  buildClaudeCodeAuthorizeUrl,
  exchangeClaudeCodeForTokens,
  generateClaudeCodePkce,
  generateClaudeCodeState,
} from '../../../core/llm/claudeCodeAuth'
import SmartComposerPlugin from '../../../main'
import { ObsidianButton } from '../../common/ObsidianButton'
import { ObsidianSetting } from '../../common/ObsidianSetting'
import { ObsidianTextInput } from '../../common/ObsidianTextInput'
import { ReactModal } from '../../common/ReactModal'

type ConnectClaudePlanModalProps = {
  plugin: SmartComposerPlugin
  onClose: () => void
}

const CLAUDE_PLAN_PROVIDER_ID = PROVIDER_TYPES_INFO['anthropic-plan']
  .defaultProviderId as string

export class ConnectClaudePlanModal extends ReactModal<ConnectClaudePlanModalProps> {
  constructor(app: App, plugin: SmartComposerPlugin) {
    super({
      app: app,
      Component: ConnectClaudePlanModalComponent,
      props: { plugin },
      options: {
        title: 'Connect Claude subscription',
      },
    })
  }
}

function ConnectClaudePlanModalComponent({
  plugin,
  onClose,
}: ConnectClaudePlanModalProps) {
  const [authorizeUrl, setAuthorizeUrl] = useState('')
  const [code, setCode] = useState('')
  const [pkceVerifier, setPkceVerifier] = useState('')
  const [state, setState] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)

  const hasAuthData = authorizeUrl.length > 0 && pkceVerifier.length > 0

  useEffect(() => {
    ;(async () => {
      try {
        const pkce = await generateClaudeCodePkce()
        const newState = generateClaudeCodeState()
        const url = buildClaudeCodeAuthorizeUrl({ pkce, state: newState })
        setPkceVerifier(pkce.verifier)
        setState(newState)
        setAuthorizeUrl(url)
      } catch {
        new Notice('Failed to initialize OAuth flow')
      }
    })()
  }, [])

  const connect = async () => {
    if (isConnecting) return
    if (!hasAuthData) {
      new Notice('OAuth link is not ready. Try again.')
      return
    }
    if (!code) {
      new Notice('Paste the authorization code')
      return
    }

    try {
      setIsConnecting(true)

      const tokens = await exchangeClaudeCodeForTokens({
        code,
        pkceVerifier,
        state,
      })

      if (
        !plugin.settings.providers.find(
          (p) =>
            p.type === 'anthropic-plan' && p.id === CLAUDE_PLAN_PROVIDER_ID,
        )
      ) {
        throw new Error('Claude Plan provider not found.')
      }
      await plugin.setSettings({
        ...plugin.settings,
        providers: plugin.settings.providers.map((p) => {
          if (p.type === 'anthropic-plan' && p.id === CLAUDE_PLAN_PROVIDER_ID) {
            return {
              ...p,
              oauth: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000,
              },
            }
          }
          return p
        }),
      })

      new Notice('Claude Plan connected')
      onClose()
    } catch {
      new Notice('OAuth failed. Double-check the code and try again.')
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <div>
      <div className="smtcmp-plan-connect-steps">
        <div className="smtcmp-plan-connect-steps-title">How it works</div>
        <ol>
          <li>Login to Claude in your browser</li>
          <li>Copy the code from the redirected URL</li>
          <li>Paste it here and click &quot;Connect&quot;</li>
        </ol>
      </div>

      <ObsidianSetting
        name="Claude login"
        desc="Login to Claude Code in your browser."
      >
        <ObsidianButton
          text="Login to Claude"
          disabled={!authorizeUrl || isConnecting}
          onClick={() => {
            if (!authorizeUrl) return
            window.open(authorizeUrl, '_blank')
          }}
          cta
        />
      </ObsidianSetting>

      <ObsidianSetting
        name="Authorization code"
        desc="Paste the code from the redirected URL."
        required
      >
        <ObsidianTextInput
          value={code}
          placeholder="Paste authorization code"
          onChange={(value) => setCode(value)}
        />
      </ObsidianSetting>

      <ObsidianSetting>
        <ObsidianButton
          text="Connect"
          onClick={() => void connect()}
          disabled={isConnecting}
          cta
        />
        <ObsidianButton
          text="Cancel"
          onClick={onClose}
          disabled={isConnecting}
        />
      </ObsidianSetting>
    </div>
  )
}
