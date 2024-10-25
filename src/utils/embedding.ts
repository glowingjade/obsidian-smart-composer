import { OpenAI } from 'openai'

import { EmbeddingModel } from '../types/embedding'

import { NoStainlessOpenAI } from './llm/ollama'

export const getEmbeddingModel = (
  name: string,
  apiKeys: {
    openAIApiKey: string
  },
): EmbeddingModel => {
  switch (name) {
    case 'text-embedding-3-small': {
      const openai = new OpenAI({
        apiKey: apiKeys.openAIApiKey,
        dangerouslyAllowBrowser: true,
      })
      return {
        name: 'text-embedding-3-small',
        dimension: 1536,
        getEmbedding: async (text: string) => {
          const embedding = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text,
          })
          return embedding.data[0].embedding
        },
      }
    }
    case 'text-embedding-3-large': {
      const openai = new OpenAI({
        apiKey: apiKeys.openAIApiKey,
        dangerouslyAllowBrowser: true,
      })
      return {
        name: 'text-embedding-3-large',
        dimension: 3072,
        getEmbedding: async (text: string) => {
          const embedding = await openai.embeddings.create({
            model: 'text-embedding-3-large',
            input: text,
          })
          return embedding.data[0].embedding
        },
      }
    }
    case 'nomic-embed-text': {
      const openai = new NoStainlessOpenAI({
        apiKey: 'null',
        dangerouslyAllowBrowser: true,
        baseURL: 'http://127.0.0.1:11434/v1'
      })
      return {
        name: 'nomic-embed-text',
        dimension: 768,
        getEmbedding: async (text: string) => {
          const embedding = await openai.embeddings.create({
            model: 'nomic-embed-text',
            input: text,
          })
          return embedding.data[0].embedding
        },
      }
    }
    case 'mxbai-embed-large': {
      const openai = new NoStainlessOpenAI({
        apiKey: 'null',
        dangerouslyAllowBrowser: true,
        baseURL: 'http://127.0.0.1:11434/v1'
      })
      return {
        name: 'mxbai-embed-large',
        dimension: 2048,
        getEmbedding: async (text: string) => {
          const embedding = await openai.embeddings.create({
            model: 'mxbai-embed-large',
            input: text,
          })
          return embedding.data[0].embedding
        },
      }
    }
    default:
      throw new Error('Invalid embedding model')
  }
}
