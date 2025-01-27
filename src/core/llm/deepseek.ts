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

export class DeepseekProvider implements BaseLLMProvider {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  async generateResponse(
    model: LLMModel,
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (!this.apiKey) {
      throw new LLMAPIKeyNotSetException(
        'Deepseek API key is missing. Please set it in settings menu.',
      )
    }

    const response = await fetch(`${this.baseUrl}/v1/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        max_tokens: request.max_tokens,
        temperature: request.temperature,
        top_p: request.top_p,
      }),
      signal: options?.signal,
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new LLMAPIKeyInvalidException(
          'Deepseek API key is invalid. Please update it in settings menu.',
        )
      }
      throw new Error(`Deepseek API request failed with status ${response.status}`)
    }

    const data = await response.json()
    return {
      id: data.id,
      choices: data.choices,
      model: data.model,
      object: 'chat.completion',
      usage: data.usage,
    }
  }

  async streamResponse(
    model: LLMModel,
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    if (!this.apiKey) {
      throw new LLMAPIKeyNotSetException(
        'Deepseek API key is missing. Please set it in settings menu.',
      )
    }

    const response = await fetch(`${this.baseUrl}/v1/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        max_tokens: request.max_tokens,
        temperature: request.temperature,
        top_p: request.top_p,
        stream: true,
      }),
      signal: options?.signal,
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new LLMAPIKeyInvalidException(
          'Deepseek API key is invalid. Please update it in settings menu.',
        )
      }
      throw new Error(`Deepseek API request failed with status ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Failed to get reader from response body')
    }

    async function* streamResponseGenerator() {
      const decoder = new TextDecoder()
      let done = false

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        if (value) {
          const chunk = decoder.decode(value, { stream: true })
          yield JSON.parse(chunk)
        }
      }
    }

    return streamResponseGenerator()
  }
}
