export type EmbeddingModelName =
  | 'openai/text-embedding-3-small'
  | 'openai/text-embedding-3-large'
  | 'gemini/text-embedding-004'
  | 'ollama/nomic-embed-text'
  | 'ollama/mxbai-embed-large'
  | 'ollama/bge-m3'

export type EmbeddingModel = {
  name: EmbeddingModelName
  dimension: number
  getEmbedding: (text: string) => Promise<number[]>
}
