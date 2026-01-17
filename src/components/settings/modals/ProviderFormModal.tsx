import { App, Notice, Platform } from 'obsidian'
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
import { LLMProvider, llmProviderSchema } from '../../../types/provider.types'
import { ObsidianButton } from '../../common/ObsidianButton'
import { ObsidianDropdown } from '../../common/ObsidianDropdown'
import { ObsidianSetting } from '../../common/ObsidianSetting'
import { ObsidianTextInput } from '../../common/ObsidianTextInput'
import { ObsidianToggle } from '../../common/ObsidianToggle'
import { ReactModal } from '../../common/ReactModal'

type ProviderFormComponentProps = {
  plugin: SmartComposerPlugin
  provider: LLMProvider | null // null for new provider
  onClose: () => void
}

export class AddProviderModal extends ReactModal<ProviderFormComponentProps> {
  constructor(app: App, plugin: SmartComposerPlugin) {
    super({
      app: app,
      Component: ProviderFormComponent,
      props: { plugin, provider: null },
      options: {
        title: 'Add Custom Provider',
      },
    })
  }
}

export class EditProviderModal extends ReactModal<ProviderFormComponentProps> {
  constructor(app: App, plugin: SmartComposerPlugin, provider: LLMProvider) {
    super({
      app: app,
      Component: ProviderFormComponent,
      props: { plugin, provider },
      options: {
        title: `Edit Provider: ${provider.id}`,
      },
    })
  }
}

function ProviderFormComponent({
  plugin,
  provider,
  onClose,
}: ProviderFormComponentProps) {
  const [formData, setFormData] = useState<LLMProvider>(
    provider
      ? { ...provider }
      : {
          type: 'openai-compatible',
          id: '',
          apiKey: '',
          baseUrl: '',
        },
  )
  const [codexAuthUrl, setCodexAuthUrl] = useState<string>('')
  const [codexCode, setCodexCode] = useState<string>('')
  const [codexPkceVerifier, setCodexPkceVerifier] = useState<string>('')
  const [isCodexAuthInProgress, setIsCodexAuthInProgress] =
    useState<boolean>(false)

  const handleSubmit = async () => {
    if (provider) {
      const newProviders = [...plugin.settings.providers]
      const currentProviderIndex = newProviders.findIndex(
        (v) => v.id === formData.id,
      )

      if (currentProviderIndex === -1) {
        new Notice(`No provider found with this ID`)
        return
      }

      const validationResult = llmProviderSchema.safeParse(formData)
      if (!validationResult.success) {
        new Notice(
          validationResult.error.issues.map((v) => v.message).join('\n'),
        )
        return
      }

      await plugin.setSettings({
        ...plugin.settings,
        providers: [
          ...plugin.settings.providers.slice(0, currentProviderIndex),
          formData,
          ...plugin.settings.providers.slice(currentProviderIndex + 1),
        ],
      })
    } else {
      if (
        plugin.settings.providers.some((p: LLMProvider) => p.id === formData.id)
      ) {
        new Notice('Provider with this ID already exists. Try a different ID.')
        return
      }

      const validationResult = llmProviderSchema.safeParse(formData)
      if (!validationResult.success) {
        new Notice(
          validationResult.error.issues.map((v) => v.message).join('\n'),
        )
        return
      }

      await plugin.setSettings({
        ...plugin.settings,
        providers: [...plugin.settings.providers, formData],
      })
    }

    onClose()
  }

  const providerTypeInfo = PROVIDER_TYPES_INFO[formData.type]

  useEffect(() => {
    return () => {
      if (Platform.isDesktop) {
        void stopCodexCallbackServer()
      }
    }
  }, [])

  const applyCodexTokens = async (code: string, pkceVerifier: string) => {
    const tokens = await exchangeCodexCodeForTokens({
      code,
      pkceVerifier,
    })
    const accountId = extractCodexAccountId(tokens)
    setFormData((prev) => {
      if (prev.type !== 'openai-codex') {
        return prev
      }

      return {
        ...prev,
        oauth: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000,
          accountId: accountId ?? prev.oauth?.accountId,
        },
      }
    })
  }

  return (
    <>
      {!provider && (
        <>
          <ObsidianSetting
            name="ID"
            desc="Choose an ID to identify this provider in your settings. This is just for your reference."
            required
          >
            <ObsidianTextInput
              value={formData.id}
              placeholder="my-custom-provider"
              onChange={(value: string) =>
                setFormData((prev) => ({ ...prev, id: value }))
              }
            />
          </ObsidianSetting>

          <ObsidianSetting name="Provider Type" required>
            <ObsidianDropdown
              value={formData.type}
              options={Object.fromEntries(
                Object.entries(PROVIDER_TYPES_INFO).map(([key, info]) => [
                  key,
                  info.label,
                ]),
              )}
              onChange={(value: string) =>
                setFormData(
                  (prev) =>
                    ({
                      ...prev,
                      type: value,
                      additionalSettings: {},
                    }) as LLMProvider,
                )
              }
            />
          </ObsidianSetting>
        </>
      )}

      {formData.type !== 'openai-codex' && (
        <>
          <ObsidianSetting
            name="API Key"
            desc="(leave blank if not required)"
            required={providerTypeInfo.requireApiKey}
          >
            <ObsidianTextInput
              value={formData.apiKey ?? ''}
              placeholder="Enter your API Key"
              onChange={(value: string) =>
                setFormData((prev) => ({ ...prev, apiKey: value }))
              }
            />
          </ObsidianSetting>

          <ObsidianSetting
            name="Base URL"
            desc="(leave blank if using default)"
            required={providerTypeInfo.requireBaseUrl}
          >
            <ObsidianTextInput
              value={formData.baseUrl ?? ''}
              placeholder="Enter base URL"
              onChange={(value: string) =>
                setFormData((prev) => ({ ...prev, baseUrl: value }))
              }
            />
          </ObsidianSetting>
        </>
      )}

      {formData.type === 'openai-codex' && (
        <>
          <ObsidianSetting
            name="OAuth Status"
            desc={
              formData.oauth?.accessToken
                ? 'OAuth connected'
                : 'OAuth not connected'
            }
          />
          <ObsidianSetting
            name="Start OAuth"
            desc={
              Platform.isDesktop
                ? 'Open the authorization URL and complete login. Smart Composer will finish automatically.'
                : 'Open the authorization URL, then copy the code from the redirected URL.'
            }
          >
            <ObsidianButton
              text="Generate OAuth URL"
              disabled={isCodexAuthInProgress}
              onClick={async () => {
                if (isCodexAuthInProgress) return
                try {
                  setIsCodexAuthInProgress(true)
                  const pkce = await generateCodexPkce()
                  const state = generateCodexState()
                  const url = buildCodexAuthorizeUrl({ pkce, state })
                  setCodexPkceVerifier(pkce.verifier)
                  setCodexAuthUrl(url)
                  window.open(url, '_blank')
                  if (!Platform.isDesktop) {
                    return
                  }

                  try {
                    const code = await startCodexCallbackServer({ state })
                    setCodexCode(code)
                    await applyCodexTokens(code, pkce.verifier)
                    new Notice('OAuth connected')
                  } catch {
                    new Notice(
                      'OAuth callback failed. Use manual code entry instead.',
                    )
                  }
                } catch {
                  new Notice('Failed to generate OAuth URL')
                } finally {
                  setIsCodexAuthInProgress(false)
                }
              }}
            />
          </ObsidianSetting>
          {codexAuthUrl.length > 0 && (
            <ObsidianSetting
              name="Authorization URL"
              desc="Open this URL in your browser if it did not open automatically."
            >
              <ObsidianTextInput
                value={codexAuthUrl}
                onChange={(value: string) => setCodexAuthUrl(value)}
              />
            </ObsidianSetting>
          )}
          <ObsidianSetting
            name="Authorization Code"
            desc="Paste the code from the redirected URL after login."
          >
            <ObsidianTextInput
              value={codexCode}
              placeholder="Enter authorization code"
              onChange={(value: string) => setCodexCode(value)}
            />
          </ObsidianSetting>
          <ObsidianSetting>
            <ObsidianButton
              text="Exchange Code"
              onClick={async () => {
                if (!codexCode || !codexPkceVerifier) {
                  new Notice('Authorization code or PKCE verifier missing')
                  return
                }
                try {
                  await applyCodexTokens(codexCode, codexPkceVerifier)
                  new Notice('OAuth connected')
                } catch {
                  new Notice('OAuth token exchange failed')
                }
              }}
            />
            <ObsidianButton
              text="Clear OAuth"
              onClick={() => {
                setFormData((prev) => ({
                  ...prev,
                  oauth: undefined,
                }))
              }}
            />
          </ObsidianSetting>
        </>
      )}

      {providerTypeInfo.additionalSettings.map((setting) => (
        <ObsidianSetting
          key={setting.key}
          name={setting.label}
          desc={'description' in setting ? setting.description : undefined}
          required={setting.required}
        >
          {setting.type === 'toggle' ? (
            <ObsidianToggle
              value={
                (formData.additionalSettings as Record<string, boolean>)?.[
                  setting.key
                ] ?? false
              }
              onChange={(value: boolean) =>
                setFormData(
                  (prev) =>
                    ({
                      ...prev,
                      additionalSettings: {
                        ...(prev.additionalSettings ?? {}),
                        [setting.key]: value,
                      },
                    }) as LLMProvider,
                )
              }
            />
          ) : (
            <ObsidianTextInput
              value={
                (formData.additionalSettings as Record<string, string>)?.[
                  setting.key
                ] ?? ''
              }
              placeholder={setting.placeholder}
              onChange={(value: string) =>
                setFormData(
                  (prev) =>
                    ({
                      ...prev,
                      additionalSettings: {
                        ...(prev.additionalSettings ?? {}),
                        [setting.key]: value,
                      },
                    }) as LLMProvider,
                )
              }
            />
          )}
        </ObsidianSetting>
      ))}

      <ObsidianSetting>
        <ObsidianButton
          text={provider ? 'Save' : 'Add'}
          onClick={handleSubmit}
          cta
        />
        <ObsidianButton text="Cancel" onClick={onClose} />
      </ObsidianSetting>
    </>
  )
}
