import OpenAI from 'openai'
import {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions'

import {
  LLMOptions,
  LLMRequestNonStreaming,
  LLMRequestStreaming,
  RequestMessage,
} from '../../types/llm/request'
import {
  LLMResponseNonStreaming,
  LLMResponseStreaming,
} from '../../types/llm/response'

import { BaseLLMProvider } from './base'

export type OpenAIModel = 'gpt-4o' | 'gpt-4o-mini'
export const OPENAI_MODELS: OpenAIModel[] = ['gpt-4o', 'gpt-4o-mini']

export class OpenAIProvider implements BaseLLMProvider {
  private client: OpenAI | null = null

  async initialize({ apiKey }: { apiKey: string }): Promise<void> {
    this.client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
  }

  async generateResponse(
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized')
    }
    const response = await this.client.chat.completions.create(
      {
        model: request.model,
        messages: request.messages.map((m) =>
          OpenAIProvider.parseRequestMessage(m),
        ),
        max_tokens: request.max_tokens,
        temperature: request.temperature,
        top_p: request.top_p,
        frequency_penalty: request.frequency_penalty,
        presence_penalty: request.presence_penalty,
        logit_bias: request.logit_bias,
      },
      {
        signal: options?.signal,
      },
    )
    return OpenAIProvider.parseNonStreamingResponse(response)
  }

  async streamResponse(
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized')
    }

    const stream = await this.client.chat.completions.create(
      {
        model: request.model,
        messages: request.messages.map((m) =>
          OpenAIProvider.parseRequestMessage(m),
        ),
        max_completion_tokens: request.max_tokens,
        temperature: request.temperature,
        top_p: request.top_p,
        frequency_penalty: request.frequency_penalty,
        presence_penalty: request.presence_penalty,
        logit_bias: request.logit_bias,
        stream: true,
      },
      {
        signal: options?.signal,
      },
    )

    async function* streamResponse(): AsyncIterable<LLMResponseStreaming> {
      for await (const chunk of stream) {
        yield OpenAIProvider.parseStreamingResponseChunk(chunk)
      }
    }

    return streamResponse()
  }

  static parseRequestMessage(
    message: RequestMessage,
  ): ChatCompletionMessageParam {
    return {
      role: message.role,
      content: message.content,
    }
  }

  static parseNonStreamingResponse(
    response: ChatCompletion,
  ): LLMResponseNonStreaming {
    return {
      id: response.id,
      choices: response.choices.map((choice) => ({
        finish_reason: choice.finish_reason,
        message: {
          content: choice.message.content,
          role: choice.message.role,
        },
      })),
      created: response.created,
      model: response.model,
      object: 'chat.completion',
      system_fingerprint: response.system_fingerprint,
      usage: response.usage,
    }
  }

  static parseStreamingResponseChunk(
    chunk: ChatCompletionChunk,
  ): LLMResponseStreaming {
    return {
      id: chunk.id,
      choices: chunk.choices.map((choice) => ({
        finish_reason: choice.finish_reason ?? null,
        delta: {
          content: choice.delta.content ?? null,
          role: choice.delta.role,
        },
      })),
      created: chunk.created,
      model: chunk.model,
      object: 'chat.completion.chunk',
      system_fingerprint: chunk.system_fingerprint,
      usage: chunk.usage,
    }
  }

  getSupportedModels(): string[] {
    return OPENAI_MODELS
  }
}
