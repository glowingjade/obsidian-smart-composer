import { requestUrl } from 'obsidian'

export async function getOllamaModels(ollamaUrl: string) {
  try {
    const response = (await requestUrl(`${ollamaUrl}/api/tags`)).json as {
      models: { name: string }[]
    }
    return response.models.map((model) => model.name)
  } catch (error) {
    return []
  }
}
