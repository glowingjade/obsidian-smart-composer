import { migrateFrom10To11 } from './10_to_11'

type SettingsData = {
  version: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chatModels?: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

describe('migrateFrom10To11', () => {
  it('should update the gemini-2.5-pro model name', () => {
    const mockData: SettingsData = {
      version: 10,
      chatModels: [
        {
          providerType: 'gemini',
          providerId: 'gemini',
          id: 'gemini-2.5-pro',
          model: 'gemini-2.5-pro-preview-03-25',
        },
        {
          providerType: 'gemini',
          providerId: 'gemini',
          id: 'gemini-1.5-pro',
          model: 'gemini-1.5-pro',
        },
      ],
    }

    const migratedData = migrateFrom10To11(mockData) as SettingsData

    // Check if version is updated
    expect(migratedData.version).toBe(11)

    // Check if the gemini-2.5-pro model name is updated
    const gemini25Pro = migratedData.chatModels?.find(
      (model) => model.id === 'gemini-2.5-pro',
    )
    expect(gemini25Pro).toBeDefined()
    expect(gemini25Pro?.model).toBe('gemini-2.5-pro')

    // Check if other models remain unchanged
    const gemini15Pro = migratedData.chatModels?.find(
      (model) => model.id === 'gemini-1.5-pro',
    )
    expect(gemini15Pro).toBeDefined()
    expect(gemini15Pro?.model).toBe('gemini-1.5-pro')
  })

  it('should handle empty or non-existent chatModels', () => {
    const mockDataEmpty: SettingsData = {
      version: 10,
      chatModels: [],
    }

    const mockDataNoModels: SettingsData = {
      version: 8,
    }

    const migratedDataEmpty = migrateFrom10To11(mockDataEmpty) as SettingsData
    const migratedDataNoModels = migrateFrom10To11(
      mockDataNoModels,
    ) as SettingsData

    // Check if version is updated
    expect(migratedDataEmpty.version).toBe(11)
    expect(migratedDataNoModels.version).toBe(11)

    // Check if chatModels is defined and contains the default models
    expect(migratedDataEmpty.chatModels).toBeDefined()
    expect(migratedDataNoModels.chatModels).toBeDefined()

    // Verify the gemini-2.5-pro model has the correct name
    const gemini25ProEmpty = migratedDataEmpty.chatModels?.find(
      (model) => model.id === 'gemini-2.5-pro',
    )
    const gemini25ProNoModels = migratedDataNoModels.chatModels?.find(
      (model) => model.id === 'gemini-2.5-pro',
    )

    expect(gemini25ProEmpty).toBeDefined()
    expect(gemini25ProEmpty?.model).toBe('gemini-2.5-pro')
    expect(gemini25ProNoModels).toBeDefined()
    expect(gemini25ProNoModels?.model).toBe('gemini-2.5-pro')
  })

  it('should preserve custom chat models', () => {
    const mockData: SettingsData = {
      version: 10,
      chatModels: [
        {
          providerType: 'gemini',
          providerId: 'gemini',
          id: 'gemini-2.5-pro',
          model: 'gemini-2.5-pro-exp-03-25',
        },
        {
          providerType: 'custom',
          providerId: 'custom-provider',
          id: 'custom-model',
          model: 'custom-model-name',
        },
      ],
    }

    const migratedData = migrateFrom10To11(mockData) as SettingsData

    // Check if custom model is preserved
    const customModel = migratedData.chatModels?.find(
      (model) => model.id === 'custom-model',
    )
    expect(customModel).toBeDefined()
    expect(customModel?.model).toBe('custom-model-name')
    expect(customModel?.providerType).toBe('custom')
  })
})
