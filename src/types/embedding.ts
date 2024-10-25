export type EmbeddingModelName =
  | 'text-embedding-3-small'
  | 'text-embedding-3-large'
  | 'nomic-embed-text'

export type EmbeddingModel = {
  name: EmbeddingModelName
  dimension: number
  getEmbedding: (text: string) => Promise<number[]>
}
