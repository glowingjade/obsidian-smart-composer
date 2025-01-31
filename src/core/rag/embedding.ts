import { GoogleGenerativeAI } from '@google/generative-ai'
import { OpenAI } from 'openai'

import { SmartCopilotSettings } from '../../settings/schema/setting.types'
import { EmbeddingModelClient } from '../../types/embedding'
import {
  LLMAPIKeyNotSetException,
  LLMBaseUrlNotSetException,
  LLMRateLimitExceededException,
} from '../llm/exception'
import { NoStainlessOpenAI } from '../llm/ollama'

// TODO: these logic should go into model provider implementation
export const getEmbeddingModelClient = ({
  settings,
  embeddingModelId,
}: {
  settings: SmartCopilotSettings
  embeddingModelId: string
}): EmbeddingModelClient => {
  const embeddingModel = settings.embeddingModels.find(
    (model) => model.id === embeddingModelId,
  )
  if (!embeddingModel) {
    throw new Error(`Embedding model ${embeddingModelId} not found`)
  }

  const embeddingProvider = settings.providers.find(
    (provider) => provider.id === embeddingModel.providerId,
  )
  if (!embeddingProvider) {
    throw new Error(`Model provider ${embeddingModel.providerId} not found`)
  }

  if (embeddingModel.providerType !== embeddingProvider.type) {
    throw new Error('Embedding model and provider type do not match')
  }

  switch (embeddingProvider.type) {
    case 'openai': {
      if (!embeddingProvider.apiKey) {
        throw new LLMAPIKeyNotSetException(
          `${embeddingProvider.id} API key is missing. Please set it in settings menu.`,
        )
      }

      const openai = new OpenAI({
        apiKey: embeddingProvider.apiKey,
        dangerouslyAllowBrowser: true,
      })
      return {
        id: embeddingModel.id,
        dimension: embeddingModel.dimension,
        getEmbedding: async (text: string) => {
          try {
            const embedding = await openai.embeddings.create({
              model: embeddingModel.model,
              input: text,
            })
            return embedding.data[0].embedding
          } catch (error) {
            if (
              error.status === 429 &&
              error.message.toLowerCase().includes('rate limit')
            ) {
              throw new LLMRateLimitExceededException(
                'OpenAI API rate limit exceeded. Please try again later.',
              )
            }
            throw error
          }
        },
      }
    }
    case 'gemini': {
      if (!embeddingProvider.apiKey) {
        throw new LLMAPIKeyNotSetException(
          `${embeddingProvider.id} API key is missing. Please set it in settings menu.`,
        )
      }

      const client = new GoogleGenerativeAI(embeddingProvider.apiKey)
      const model = client.getGenerativeModel({ model: embeddingModel.model })
      return {
        id: embeddingModel.id,
        dimension: embeddingModel.dimension,
        getEmbedding: async (text: string) => {
          try {
            const response = await model.embedContent(text)
            return response.embedding.values
          } catch (error) {
            if (
              error.status === 429 &&
              error.message.includes('RATE_LIMIT_EXCEEDED')
            ) {
              throw new LLMRateLimitExceededException(
                'Gemini API rate limit exceeded. Please try again later.',
              )
            }
            throw error
          }
        },
      }
    }
    case 'ollama': {
      if (!embeddingProvider.baseUrl) {
        throw new LLMBaseUrlNotSetException(
          `${embeddingProvider.id} base url is missing. Please set it in settings menu.`,
        )
      }

      const openai = new NoStainlessOpenAI({
        apiKey: embeddingProvider.apiKey,
        dangerouslyAllowBrowser: true,
        baseURL: `${embeddingProvider.baseUrl}/v1`,
      })
      return {
        id: embeddingModel.id,
        dimension: embeddingModel.dimension,
        getEmbedding: async (text: string) => {
          const embedding = await openai.embeddings.create({
            model: embeddingModel.model,
            input: text,
          })
          return embedding.data[0].embedding
        },
      }
    }
    default:
      throw new Error(
        `Embedding model is not supported for provider type: ${embeddingProvider.type}`,
      )
  }
}
