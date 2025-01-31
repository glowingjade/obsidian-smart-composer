import { LLMModel } from './llm/model'

// TODO: remove this types

// export type EmbeddingModelId =
//   | 'openai/text-embedding-3-small'
//   | 'openai/text-embedding-3-large'
//   | 'gemini/text-embedding-004'
//   | 'ollama/nomic-embed-text'
//   | 'ollama/mxbai-embed-large'
//   | 'ollama/bge-m3'

export type EmbeddingModelOption = {
  id: string
  name: string
  model: LLMModel
  dimension: number
}

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
