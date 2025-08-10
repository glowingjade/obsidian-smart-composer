import { SettingMigration } from '../setting.types'

export type ExistingSettingsData = Parameters<SettingMigration['migrate']>[0]
export type DefaultProviders = readonly {
  type: string
  id: string
}[]

export const getMigratedProviders = (
  existingData: ExistingSettingsData,
  defaultProvidersForVersion: DefaultProviders,
) => {
  if (!('providers' in existingData && Array.isArray(existingData.providers))) {
    return defaultProvidersForVersion
  }

  const defaultProviders = defaultProvidersForVersion.map((provider) => {
    const existingProvider = (existingData.providers as unknown[]).find(
      (p: unknown) =>
        (p as { type: string }).type === provider.type &&
        (p as { id: string }).id === provider.id,
    )
    return existingProvider
      ? // FIXME: Replace Object.assign with deep merge to properly handle nested objects
        // like reasoning, thinking, web_search_options. Object.assign only does shallow
        // merging, which overwrites entire nested objects instead of merging their properties.
        // This causes user settings to be overwritten by default settings.
        Object.assign(existingProvider, provider)
      : provider
  })
  const customProviders = (existingData.providers as unknown[]).filter(
    (p: unknown) =>
      !defaultProviders.some(
        (dp: unknown) => (dp as { id: string }).id === (p as { id: string }).id,
      ),
  )

  return [...defaultProviders, ...customProviders]
}

export type DefaultChatModels = {
  id: string
  providerType: string
  providerId: string
  model: string
  reasoning_effort?: string
  thinking?: {
    budget_tokens: number
  }
  web_search_options?: {
    search_context_size?: string
  }
  enable?: boolean
}[]

export const getMigratedChatModels = (
  existingData: ExistingSettingsData,
  defaultChatModelsForVersion: DefaultChatModels,
) => {
  if (
    !('chatModels' in existingData && Array.isArray(existingData.chatModels))
  ) {
    return defaultChatModelsForVersion
  }

  const defaultChatModels = defaultChatModelsForVersion.map((model) => {
    const existingModel = (existingData.chatModels as unknown[]).find(
      (m: unknown) => {
        return (m as { id: string }).id === model.id
      },
    )
    if (existingModel) {
      // FIXME: Replace Object.assign with deep merge to properly handle nested objects
      // like reasoning, thinking, web_search_options. Object.assign only does shallow
      // merging, which overwrites entire nested objects instead of merging their properties.
      // This causes user settings to be overwritten by default settings.
      return Object.assign(existingModel, model)
    }
    return model
  })
  const customChatModels = (existingData.chatModels as unknown[]).filter(
    (m: unknown) => {
      return !defaultChatModels.some(
        (dm: unknown) => (dm as { id: string }).id === (m as { id: string }).id,
      )
    },
  )

  return [...defaultChatModels, ...customChatModels]
}
