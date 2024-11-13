import OpenAI from 'openai'
import { FinalRequestOptions } from 'openai/core'
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

export class OpenAICompatibleProvider implements BaseLLMProvider {
  private client: OpenAI

  constructor(client: OpenAI) {
    this.client = client
  }

  async generateResponse(
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    const response = await this.client.chat.completions.create(
      {
        model: request.model,
        messages: request.messages.map((m) =>
          OpenAICompatibleProvider.parseRequestMessage(m),
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
    return OpenAICompatibleProvider.parseNonStreamingResponse(response)
  }

  async streamResponse(
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    const stream = await this.client.chat.completions.create(
      {
        model: request.model,
        messages: request.messages.map((m) =>
          OpenAICompatibleProvider.parseRequestMessage(m),
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

    // eslint-disable-next-line no-inner-declarations
    async function* streamResponse(): AsyncIterable<LLMResponseStreaming> {
      for await (const chunk of stream) {
        yield OpenAICompatibleProvider.parseStreamingResponseChunk(chunk)
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
    throw new Error('Not implemented')
  }

  getApiKey(): string | undefined {
    return this.client.apiKey
  }
}

/**
 * A modified OpenAI client that removes Stainless-specific headers to prevent CORS issues.
 * The default OpenAI client adds x-stainless-* headers which trigger CORS preflight requests.
 */
export class NoStainlessOpenAI extends OpenAI {
  defaultHeaders() {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }
  }

  buildRequest<Req>(
    options: FinalRequestOptions<Req>,
    { retryCount = 0 }: { retryCount?: number } = {},
  ): { req: RequestInit; url: string; timeout: number } {
    const req = super.buildRequest(options, { retryCount })
    const headers = req.req.headers as Record<string, string>
    Object.keys(headers).forEach((k) => {
      if (k.startsWith('x-stainless')) {
        delete headers[k]
      }
    })
    return req
  }
}
