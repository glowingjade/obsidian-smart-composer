export type SmartCopilotSettings = {
  openAIApiKey: string
  groqApiKey: string
  anthropicApiKey: string
  chatModel: string
  applyModel: string
  embeddingModel: string
  chunkOptions: {
    chunkSize: number
  }
  ragOptions: {
    minSimilarity: number
    limit: number
  }
}
