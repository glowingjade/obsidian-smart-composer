import { SmartCopilotSettings } from './types/settings'

export const CHAT_VIEW_TYPE = 'smtcmp-chat-view'
export const APPLY_VIEW_TYPE = 'smtcmp-apply-view'

export const DEFAULT_SETTINGS: SmartCopilotSettings = {
  openAIApiKey: '',
  groqApiKey: '',
  anthropicApiKey: '',
  chatModel: 'claude-3-5-sonnet-20240620',
  applyModel: 'llama-3.1-8b-instant',
}

export const CHAT_MODEL_OPTIONS = [
  {
    name: 'gpt-4o',
    value: 'gpt-4o',
  },
  {
    name: 'gpt-4o-mini',
    value: 'gpt-4o-mini',
  },
  {
    name: 'claude-3.5-sonnet',
    value: 'claude-3-5-sonnet-20240620',
  },
  {
    name: 'llama-3.1-70b (Groq)',
    value: 'llama-3.1-70b-versatile',
  },
]

export const APPLY_MODEL_OPTIONS = [
  {
    name: 'gpt-4o-mini',
    value: 'gpt-4o-mini',
  },
  {
    name: 'llama-3.1-8b (Groq)',
    value: 'llama-3.1-8b-instant',
  },
  {
    name: 'llama3-8b (Groq)',
    value: 'llama3-8b-8192',
  },
  {
    name: 'llama-3.1-70b (Groq)',
    value: 'llama-3.1-70b-versatile',
  },
]
