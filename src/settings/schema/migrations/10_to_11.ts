import { SettingMigration } from '../setting.types'

import { getMigratedChatModels } from './migrationUtils'

/**
 * Migration from version 10 to version 11
 * - Add following models:
 *   - claude-sonnet-4.0
 *   - claude-opus-4.1
 *   - gpt-5
 *   - gpt-5-mini
 *   - gpt-5-nano
 *   - gemini-2.5-pro
 *   - gemini-2.5-flash
 *   - gemini-2.5-flash-lite
 */
export const migrateFrom10To11: SettingMigration['migrate'] = (data) => {
  const newData = { ...data }
  newData.version = 11

  // Transform OpenAI models with reasoning_effort to new reasoning structure
  if ('chatModels' in newData && Array.isArray(newData.chatModels)) {
    newData.chatModels = newData.chatModels.map((model) => {
      if (model.providerType === 'openai' && 'reasoning_effort' in model) {
        model = {
          ...model,
          reasoning: {
            enabled: true,
            reasoning_effort: model.reasoning_effort,
          },
        }
        delete model.reasoning_effort
      }
      return model as unknown
    })
  }

  // Transform Anthropic models with thinking.budget_tokens to new thinking structure
  if ('chatModels' in newData && Array.isArray(newData.chatModels)) {
    newData.chatModels = newData.chatModels.map((model) => {
      if (
        model.providerType === 'anthropic' &&
        'thinking' in model &&
        'budget_tokens' in model.thinking
      ) {
        model = {
          ...model,
          thinking: {
            enabled: true,
            budget_tokens: model.thinking.budget_tokens,
          },
        }
      }
      return model as unknown
    })
  }

  newData.chatModels = getMigratedChatModels(newData, DEFAULT_CHAT_MODELS_V11)

  return newData
}

type DefaultChatModelsV11 = {
  id: string
  providerType: string
  providerId: string
  model: string
  reasoning?: {
    enabled: boolean
    reasoning_effort?: string
  }
  thinking?: {
    enabled: boolean
    budget_tokens: number
  }
  web_search_options?: {
    search_context_size?: string
  }
  enable?: boolean
}[]

export const DEFAULT_CHAT_MODELS_V11: DefaultChatModelsV11 = [
  {
    providerType: 'anthropic',
    providerId: 'anthropic',
    id: 'claude-sonnet-4.0',
    model: 'claude-sonnet-4-0',
  },
  {
    providerType: 'anthropic',
    providerId: 'anthropic',
    id: 'claude-opus-4.1',
    model: 'claude-opus-4-1',
  },
  {
    providerType: 'anthropic',
    providerId: 'anthropic',
    id: 'claude-3.7-sonnet',
    model: 'claude-3-7-sonnet-latest',
  },
  {
    providerType: 'anthropic',
    providerId: 'anthropic',
    id: 'claude-3.5-sonnet',
    model: 'claude-3-5-sonnet-latest',
  },
  {
    providerType: 'anthropic',
    providerId: 'anthropic',
    id: 'claude-3.5-haiku',
    model: 'claude-3-5-haiku-latest',
  },
  {
    providerType: 'openai',
    providerId: 'openai',
    id: 'gpt-5',
    model: 'gpt-5',
  },
  {
    providerType: 'openai',
    providerId: 'openai',
    id: 'gpt-5-mini',
    model: 'gpt-5-mini',
  },
  {
    providerType: 'openai',
    providerId: 'openai',
    id: 'gpt-5-nano',
    model: 'gpt-5-nano',
  },
  {
    providerType: 'openai',
    providerId: 'openai',
    id: 'gpt-4.1',
    model: 'gpt-4.1',
  },
  {
    providerType: 'openai',
    providerId: 'openai',
    id: 'gpt-4.1-mini',
    model: 'gpt-4.1-mini',
  },
  {
    providerType: 'openai',
    providerId: 'openai',
    id: 'gpt-4.1-nano',
    model: 'gpt-4.1-nano',
  },
  {
    providerType: 'openai',
    providerId: 'openai',
    id: 'gpt-4o',
    model: 'gpt-4o',
  },
  {
    providerType: 'openai',
    providerId: 'openai',
    id: 'gpt-4o-mini',
    model: 'gpt-4o-mini',
  },
  {
    providerType: 'openai',
    providerId: 'openai',
    id: 'o4-mini',
    model: 'o4-mini',
    reasoning: {
      enabled: true,
      reasoning_effort: 'medium',
    },
  },
  {
    providerType: 'openai',
    providerId: 'openai',
    id: 'o3',
    model: 'o3',
    reasoning: {
      enabled: true,
      reasoning_effort: 'medium',
    },
  },
  {
    providerType: 'gemini',
    providerId: 'gemini',
    id: 'gemini-2.5-pro',
    model: 'gemini-2.5-pro',
  },
  {
    providerType: 'gemini',
    providerId: 'gemini',
    id: 'gemini-2.5-flash',
    model: 'gemini-2.5-flash',
  },
  {
    providerType: 'gemini',
    providerId: 'gemini',
    id: 'gemini-2.5-flash-lite',
    model: 'gemini-2.5-flash-lite',
  },
  {
    providerType: 'gemini',
    providerId: 'gemini',
    id: 'gemini-2.0-flash',
    model: 'gemini-2.0-flash',
  },
  {
    providerType: 'gemini',
    providerId: 'gemini',
    id: 'gemini-2.0-flash-lite',
    model: 'gemini-2.0-flash-lite',
  },
  {
    providerType: 'deepseek',
    providerId: 'deepseek',
    id: 'deepseek-chat',
    model: 'deepseek-chat',
  },
  {
    providerType: 'deepseek',
    providerId: 'deepseek',
    id: 'deepseek-reasoner',
    model: 'deepseek-reasoner',
  },
  {
    providerType: 'perplexity',
    providerId: 'perplexity',
    id: 'sonar',
    model: 'sonar',
    web_search_options: {
      search_context_size: 'low',
    },
  },
  {
    providerType: 'perplexity',
    providerId: 'perplexity',
    id: 'sonar-pro',
    model: 'sonar',
    web_search_options: {
      search_context_size: 'low',
    },
  },
  {
    providerType: 'perplexity',
    providerId: 'perplexity',
    id: 'sonar-deep-research',
    model: 'sonar-deep-research',
    web_search_options: {
      search_context_size: 'low',
    },
  },
  {
    providerType: 'perplexity',
    providerId: 'perplexity',
    id: 'sonar-reasoning',
    model: 'sonar',
    web_search_options: {
      search_context_size: 'low',
    },
  },
  {
    providerType: 'perplexity',
    providerId: 'perplexity',
    id: 'sonar-reasoning-pro',
    model: 'sonar',
    web_search_options: {
      search_context_size: 'low',
    },
  },
  {
    providerType: 'morph',
    providerId: 'morph',
    id: 'morph-v0',
    model: 'morph-v0',
  },
]
