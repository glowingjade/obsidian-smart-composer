import { SettingMigration } from "../setting.types";

type ExistingSettingsData = Parameters<SettingMigration['migrate']>[0];
type DefaultProviders = readonly {
  type: string
  id: string
}[];

export const getMigratedProviders = (existingData: ExistingSettingsData, defaultProvidersForVersion: DefaultProviders) => {
  if (!('providers' in existingData && Array.isArray(existingData.providers))) {
    return defaultProvidersForVersion;
  }

  const defaultProviders = defaultProvidersForVersion.map((provider) => {
    const existingProvider = (existingData.providers as unknown[]).find(
      (p: unknown) =>
        (p as { type: string }).type === provider.type &&
        (p as { id: string }).id === provider.id,
    )
    return existingProvider
      ? Object.assign(existingProvider, provider)
      : provider
  })
  const customProviders = (existingData.providers as unknown[]).filter(
    (p: unknown) =>
      !defaultProviders.some(
        (dp: unknown) =>
          (dp as { id: string }).id === (p as { id: string }).id,
      ),
  )
  return [...defaultProviders, ...customProviders];
}
