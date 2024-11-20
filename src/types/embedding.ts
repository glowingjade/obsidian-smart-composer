import { LLMModel } from './llm/model'

export type EmbeddingModelId =
  | 'openai/text-embedding-3-small'
  | 'openai/text-embedding-3-large'
  | 'ollama/nomic-embed-text'
  | 'ollama/mxbai-embed-large'
  | 'ollama/bge-m3'

export type EmbeddingModelOption = {
  id: EmbeddingModelId
  name: string
  model: LLMModel
  dimension: number
}

export type EmbeddingModel = {
  id: EmbeddingModelId
  dimension: number
  getEmbedding: (text: string) => Promise<number[]>
}
