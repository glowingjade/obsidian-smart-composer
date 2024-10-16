export type EmbeddingModelOption = {
  name: string
  value: string
  dimension: number
}

export type EmbeddingModel = {
  name: string
  dimension: number
  getEmbedding: (text: string) => Promise<number[]>
}
