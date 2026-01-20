import { Check, CircleMinus } from 'lucide-react'
import { App } from 'obsidian'

import { PROVIDER_TYPES_INFO } from '../../../constants'
import { useSettings } from '../../../contexts/settings-context'
import SmartComposerPlugin from '../../../main'
import { LLMProvider } from '../../../types/provider.types'
import { ConfirmModal } from '../../modals/ConfirmModal'
import { ConnectClaudePlanModal } from '../modals/ConnectClaudePlanModal'
import { ConnectGeminiPlanModal } from '../modals/ConnectGeminiPlanModal'
import { ConnectOpenAIPlanModal } from '../modals/ConnectOpenAIPlanModal'

type PlanConnectionsSectionProps = {
  app: App
  plugin: SmartComposerPlugin
}

const CLAUDE_PLAN_PROVIDER_ID = PROVIDER_TYPES_INFO['anthropic-plan']
  .defaultProviderId as string
const OPENAI_PLAN_PROVIDER_ID = PROVIDER_TYPES_INFO['openai-plan']
  .defaultProviderId as string
const GEMINI_PLAN_PROVIDER_ID = PROVIDER_TYPES_INFO['gemini-plan']
  .defaultProviderId as string

export function PlanConnectionsSection({
  app,
  plugin,
}: PlanConnectionsSectionProps) {
  const { settings, setSettings } = useSettings()

  const claudePlanProvider = settings.providers.find(
    (p): p is Extract<LLMProvider, { type: 'anthropic-plan' }> =>
      p.id === CLAUDE_PLAN_PROVIDER_ID && p.type === 'anthropic-plan',
  )
  const openAIPlanProvider = settings.providers.find(
    (p): p is Extract<LLMProvider, { type: 'openai-plan' }> =>
      p.id === OPENAI_PLAN_PROVIDER_ID && p.type === 'openai-plan',
  )
  const geminiPlanProvider = settings.providers.find(
    (p): p is Extract<LLMProvider, { type: 'gemini-plan' }> =>
      p.id === GEMINI_PLAN_PROVIDER_ID && p.type === 'gemini-plan',
  )

  const isClaudeConnected = !!claudePlanProvider?.oauth?.accessToken
  const isOpenAIConnected = !!openAIPlanProvider?.oauth?.accessToken
  const isGeminiConnected = !!geminiPlanProvider?.oauth?.accessToken

  const disconnect = (
    providerType: 'anthropic-plan' | 'openai-plan' | 'gemini-plan',
  ) => {
    const providerId =
      providerType === 'anthropic-plan'
        ? CLAUDE_PLAN_PROVIDER_ID
        : providerType === 'openai-plan'
          ? OPENAI_PLAN_PROVIDER_ID
          : GEMINI_PLAN_PROVIDER_ID

    new ConfirmModal(app, {
      title: 'Disconnect subscription',
      message:
        providerType === 'anthropic-plan'
          ? 'Disconnect Claude from Smart Composer?'
          : providerType === 'openai-plan'
            ? 'Disconnect OpenAI from Smart Composer?'
            : 'Disconnect Gemini from Smart Composer?',
      ctaText: 'Disconnect',
      onConfirm: async () => {
        await setSettings({
          ...settings,
          providers: settings.providers.map((p) => {
            if (p.id !== providerId || p.type !== providerType) return p
            return {
              ...p,
              oauth: undefined,
            }
          }),
        })
      },
    }).open()
  }

  return (
    <div className="smtcmp-settings-section">
      <div className="smtcmp-settings-header">Connect your subscription</div>

      <div className="smtcmp-settings-desc">
        <div className="smtcmp-settings-desc-warning">
          <strong className="smtcmp-settings-desc-warning-title">
            Warning:
          </strong>{' '}
          Anthropic has restricted third-party OAuth access, and there are
          reports of account bans when using subscription OAuth via third-party
          clients. See the{' '}
          <a href="https://github.com/glowingjade/obsidian-smart-composer?tab=readme-ov-file">
            README
          </a>{' '}
          for full details and use at your own risk.
        </div>
        Use a subscription instead of API-key billing. Connected subscriptions
        consume your plan&apos;s included usage (Codex for OpenAI, Claude Code
        for Anthropic, Gemini Code Assist for Gemini). Subscriptions aren&apos;t
        supported on mobile environments.
        <br />
      </div>

      <div className="smtcmp-plan-connection-grid">
        <div className="smtcmp-plan-connection-card">
          <div className="smtcmp-plan-connection-card-header">
            <div className="smtcmp-plan-connection-card-title">Claude</div>
            <PlanConnectionStatusBadge connected={isClaudeConnected} />
          </div>

          <div className="smtcmp-plan-connection-card-desc">
            Uses your Claude Code usage from your Claude plan.
            <br />
            Check your limit in Claude Code with <code>/usage</code>.
          </div>

          <div className="smtcmp-plan-connection-card-actions">
            {!isClaudeConnected && (
              <button
                className="mod-cta"
                onClick={() => new ConnectClaudePlanModal(app, plugin).open()}
              >
                Connect
              </button>
            )}
            {isClaudeConnected && (
              <button onClick={() => disconnect('anthropic-plan')}>
                Disconnect
              </button>
            )}
          </div>
        </div>

        <div className="smtcmp-plan-connection-card">
          <div className="smtcmp-plan-connection-card-header">
            <div className="smtcmp-plan-connection-card-title">OpenAI</div>
            <PlanConnectionStatusBadge connected={isOpenAIConnected} />
          </div>

          <div className="smtcmp-plan-connection-card-desc">
            Uses your Codex usage from your ChatGPT plan.
            <br />
            <a
              href="https://chatgpt.com/codex/settings/usage"
              target="_blank"
              rel="noopener noreferrer"
            >
              Check Codex usage and limits
            </a>
          </div>

          <div className="smtcmp-plan-connection-card-actions">
            {!isOpenAIConnected && (
              <button
                className="mod-cta"
                onClick={() => new ConnectOpenAIPlanModal(app, plugin).open()}
              >
                Connect
              </button>
            )}
            {isOpenAIConnected && (
              <button onClick={() => disconnect('openai-plan')}>
                Disconnect
              </button>
            )}
          </div>
        </div>

        <div className="smtcmp-plan-connection-card">
          <div className="smtcmp-plan-connection-card-header">
            <div className="smtcmp-plan-connection-card-title">Gemini</div>
            <PlanConnectionStatusBadge connected={isGeminiConnected} />
          </div>

          <div className="smtcmp-plan-connection-card-desc">
            Uses your Gemini Code Assist usage from your Google AI Plan.
            <br />
            Check your limit in Gemini CLI with <code>/stats</code>.
          </div>

          <div className="smtcmp-plan-connection-card-actions">
            {!isGeminiConnected && (
              <button
                className="mod-cta"
                onClick={() => new ConnectGeminiPlanModal(app, plugin).open()}
              >
                Connect
              </button>
            )}
            {isGeminiConnected && (
              <button onClick={() => disconnect('gemini-plan')}>
                Disconnect
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PlanConnectionStatusBadge({ connected }: { connected: boolean }) {
  const statusConfig = connected
    ? {
        icon: <Check size={16} />,
        label: 'Connected',
        statusClass: 'smtcmp-mcp-server-status-badge--connected',
      }
    : {
        icon: <CircleMinus size={14} />,
        label: 'Disconnected',
        statusClass: 'smtcmp-mcp-server-status-badge--disconnected',
      }

  return (
    <div
      className={`smtcmp-mcp-server-status-badge ${statusConfig.statusClass}`}
    >
      {statusConfig.icon}
      <div className="smtcmp-mcp-server-status-badge-label">
        {statusConfig.label}
      </div>
    </div>
  )
}
