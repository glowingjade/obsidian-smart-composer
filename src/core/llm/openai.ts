import OpenAI from 'openai'
import { ReasoningEffort } from 'openai/resources/shared'

import { ChatModel } from '../../types/chat-model.types'
import {
  LLMOptions,
  LLMRequestNonStreaming,
  LLMRequestStreaming,
} from '../../types/llm/request'
import {
  LLMResponseNonStreaming,
  LLMResponseStreaming,
} from '../../types/llm/response'
import { LLMProvider } from '../../types/provider.types'

import { BaseLLMProvider } from './base'
import {
  LLMAPIKeyInvalidException,
  LLMAPIKeyNotSetException,
  LLMRateLimitExceededException,
} from './exception'
import { OpenAIMessageAdapter } from './openaiMessageAdapter'

export class OpenAIAuthenticatedProvider extends BaseLLMProvider<
  Extract<LLMProvider, { type: 'openai' }>
> {
  private adapter: OpenAIMessageAdapter
  private client: OpenAI

  constructor(provider: Extract<LLMProvider, { type: 'openai' }>) {
    super(provider)
    this.client = new OpenAI({
      apiKey: provider.apiKey ?? '',
      baseURL: provider.baseUrl
        ? provider.baseUrl.replace(/\/+$/, '')
        : undefined, // use default
      dangerouslyAllowBrowser: true,
    })
    this.adapter = new OpenAIMessageAdapter()
  }

  async generateResponse(
    model: ChatModel,
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (model.providerType !== 'openai') {
      throw new Error('Model is not an OpenAI model')
    }

    if (!this.client.apiKey) {
      throw new LLMAPIKeyNotSetException(
        `Provider ${this.provider.id} API key is missing. Please set it in settings menu.`,
      )
    }
    try {
      const response = await this.adapter.generateResponse(
        this.client,
        {
          ...request,
          reasoning_effort: model.reasoning?.enabled
            ? (model.reasoning.reasoning_effort as ReasoningEffort)
            : undefined,
        },
        options,
      )

      // Ensure choices exist and have at least one choice
      if (!response.choices || response.choices.length === 0) {
        console.error('No response choices available')
        throw new Error('No response choices available')
      }

      // Ensure the first choice has a message with content
      const firstChoice = response.choices[0]
      if (
        !firstChoice.message ||
        firstChoice.message.content === null ||
        firstChoice.message.content === undefined
      ) {
        console.error('No content in the first response choice')
        throw new Error('No content in the first response choice')
      }

      const finalResponse = {
        ...response,
        content: firstChoice.message.content,
      }

      return finalResponse
    } catch (error) {
      console.error('Error in generateResponse:', error)
      if (error instanceof OpenAI.AuthenticationError) {
        throw new LLMAPIKeyInvalidException(
          'OpenAI API key is invalid. Please update it in settings menu.',
          error,
        )
      }
      throw error
    }
  }

  async streamResponse(
    model: ChatModel,
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    if (model.providerType !== 'openai') {
      throw new Error('Model is not an OpenAI model')
    }

    if (!this.client.apiKey) {
      throw new LLMAPIKeyNotSetException(
        `Provider ${this.provider.id} API key is missing. Please set it in settings menu.`,
      )
    }
    try {
      return await this.adapter.streamResponse(
        this.client,
        {
          ...request,
          reasoning_effort: model.reasoning?.enabled
            ? (model.reasoning.reasoning_effort as ReasoningEffort)
            : undefined,
        },
        options,
      )
    } catch (error) {
      console.error('Error in streamResponse:', error)
      if (error instanceof OpenAI.AuthenticationError) {
        throw new LLMAPIKeyInvalidException(
          'OpenAI API key is invalid. Please update it in settings menu.',
          error,
        )
      }
      throw error
    }
  }

  async getEmbedding(model: string, text: string): Promise<number[]> {
    if (!this.client.apiKey) {
      throw new LLMAPIKeyNotSetException(
        `Provider ${this.provider.id} API key is missing. Please set it in settings menu.`,
      )
    }

    try {
      const embedding = await this.client.embeddings.create({
        model: model,
        input: text,
      })
      return embedding.data[0].embedding
    } catch (error) {
      if (error.status === 429) {
        throw new LLMRateLimitExceededException(
          'OpenAI API rate limit exceeded. Please try again later.',
        )
      }
      throw error
    }
  }
}
