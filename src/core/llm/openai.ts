import OpenAI from 'openai'

import { LLMModel } from '../../types/llm/model'
import {
  LLMOptions,
  LLMRequestNonStreaming,
  LLMRequestStreaming,
} from '../../types/llm/request'
import {
  LLMResponseNonStreaming,
  LLMResponseStreaming,
} from '../../types/llm/response'

import { BaseLLMProvider } from './base'
import {
  LLMAPIKeyInvalidException,
  LLMAPIKeyNotSetException,
} from './exception'
import { OpenAIMessageAdapter } from './openaiMessageAdapter'

export class OpenAIAuthenticatedProvider implements BaseLLMProvider {
  private adapter: OpenAIMessageAdapter
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
    this.adapter = new OpenAIMessageAdapter()
  }

  async generateResponse(
    model: LLMModel,
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    
    if (!this.client.apiKey) {
      throw new LLMAPIKeyNotSetException(
        'OpenAI API key is missing. Please set it in settings menu.',
      )
    }
    try {
      const response = await this.adapter.generateResponse(this.client, request, options)
            
      // Ensure choices exist and have at least one choice
      if (!response.choices || response.choices.length === 0) {
        console.error('No response choices available')
        throw new Error('No response choices available')
      }
      
      // Ensure the first choice has a message with content
      const firstChoice = response.choices[0]      
      if (!firstChoice.message || firstChoice.message.content === null || firstChoice.message.content === undefined) {
        console.error('No content in the first response choice')
        throw new Error('No content in the first response choice')
      }
      
      const finalResponse = {
        ...response,
        content: firstChoice.message.content
      }
            
      return finalResponse
    } catch (error) {
      console.error('Error in generateResponse:', error)
      if (error instanceof OpenAI.AuthenticationError) {
        throw new LLMAPIKeyInvalidException(
          'OpenAI API key is invalid. Please update it in settings menu.',
        )
      }
      throw error
    }
  }

  async streamResponse(
    model: LLMModel,
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    // Check if the model explicitly does not support streaming
    if (model.supportsStreaming === false) {
      // For non-streaming models, fall back to generateResponse
      const nonStreamingResponse = await this.generateResponse(
        model,
        { ...request, stream: false },
        options
      )

      // Create an async generator to convert the non-streaming response to a stream
      async function* generateStream(): AsyncGenerator<LLMResponseStreaming> {
        yield {
          id: nonStreamingResponse.id,
          choices: [{
            finish_reason: nonStreamingResponse.choices[0].finish_reason,
            delta: {
              content: nonStreamingResponse.choices[0].message.content,
              role: 'assistant'
            }
          }],
          created: nonStreamingResponse.created,
          model: nonStreamingResponse.model,
          object: 'chat.completion.chunk',
          system_fingerprint: nonStreamingResponse.system_fingerprint,
          usage: nonStreamingResponse.usage
        }
      }

      return generateStream()
    }

    if (!this.client.apiKey) {
      throw new LLMAPIKeyNotSetException(
        'OpenAI API key is missing. Please set it in settings menu.',
      )
    }
    try {
      // The adapter.streamResponse already returns AsyncIterable<LLMResponseStreaming>
      return await this.adapter.streamResponse(this.client, request, options)
    } catch (error) {
      console.error('Error in streamResponse:', error)
      if (error instanceof OpenAI.AuthenticationError) {
        throw new LLMAPIKeyInvalidException(
          'OpenAI API key is invalid. Please update it in settings menu.',
        )
      }
      throw error
    }
  }
}
