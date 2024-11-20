import { OpenAI } from 'openai'

import { EmbeddingModel } from '../../types/embedding'
import {
  LLMAPIKeyNotSetException,
  LLMBaseUrlNotSetException,
} from '../llm/exception'
import { NoStainlessOpenAI } from '../llm/ollama'

export const getEmbeddingModel = (
  embeddingModelId: string,
  apiKeys: {
    openAIApiKey: string
  },
  ollamaBaseUrl: string,
): EmbeddingModel => {
  switch (embeddingModelId) {
    case 'openai/text-embedding-3-small': {
      const openai = new OpenAI({
        apiKey: apiKeys.openAIApiKey,
        dangerouslyAllowBrowser: true,
      })
      return {
        id: 'openai/text-embedding-3-small',
        dimension: 1536,
        getEmbedding: async (text: string) => {
          if (!openai.apiKey) {
            throw new LLMAPIKeyNotSetException(
              'OpenAI API key is missing. Please set it in settings menu.',
            )
          }
          const embedding = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text,
          })
          return embedding.data[0].embedding
        },
      }
    }
    case 'openai/text-embedding-3-large': {
      const openai = new OpenAI({
        apiKey: apiKeys.openAIApiKey,
        dangerouslyAllowBrowser: true,
      })
      return {
        id: 'openai/text-embedding-3-large',
        dimension: 3072,
        getEmbedding: async (text: string) => {
          if (!openai.apiKey) {
            throw new LLMAPIKeyNotSetException(
              'OpenAI API key is missing. Please set it in settings menu.',
            )
          }
          const embedding = await openai.embeddings.create({
            model: 'text-embedding-3-large',
            input: text,
          })
          return embedding.data[0].embedding
        },
      }
    }
    case 'ollama/nomic-embed-text': {
      const openai = new NoStainlessOpenAI({
        apiKey: '',
        dangerouslyAllowBrowser: true,
        baseURL: `${ollamaBaseUrl}/v1`,
      })
      return {
        id: 'ollama/nomic-embed-text',
        dimension: 768,
        getEmbedding: async (text: string) => {
          if (!ollamaBaseUrl) {
            throw new LLMBaseUrlNotSetException(
              'Ollama Address is missing. Please set it in settings menu.',
            )
          }
          const embedding = await openai.embeddings.create({
            model: 'nomic-embed-text',
            input: text,
          })
          return embedding.data[0].embedding
        },
      }
    }
    case 'ollama/mxbai-embed-large': {
      const openai = new NoStainlessOpenAI({
        apiKey: '',
        dangerouslyAllowBrowser: true,
        baseURL: `${ollamaBaseUrl}/v1`,
      })
      return {
        id: 'ollama/mxbai-embed-large',
        dimension: 1024,
        getEmbedding: async (text: string) => {
          if (!ollamaBaseUrl) {
            throw new LLMBaseUrlNotSetException(
              'Ollama Address is missing. Please set it in settings menu.',
            )
          }
          const embedding = await openai.embeddings.create({
            model: 'mxbai-embed-large',
            input: text,
          })
          return embedding.data[0].embedding
        },
      }
    }
    case 'ollama/bge-m3': {
      const openai = new NoStainlessOpenAI({
        apiKey: '',
        dangerouslyAllowBrowser: true,
        baseURL: `${ollamaBaseUrl}/v1`,
      })
      return {
        id: 'ollama/bge-m3',
        dimension: 1024,
        getEmbedding: async (text: string) => {
          if (!ollamaBaseUrl) {
            throw new LLMBaseUrlNotSetException(
              'Ollama Address is missing. Please set it in settings menu.',
            )
          }
          const embedding = await openai.embeddings.create({
            model: 'bge-m3',
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
