export type EmbeddingModelClient = {
  id: string
  dimension: number
  getEmbedding: (text: string) => Promise<number[]>
}

export type EmbeddingDbStats = {
  model: string
  rowCount: number
  totalDataBytes: number
}
