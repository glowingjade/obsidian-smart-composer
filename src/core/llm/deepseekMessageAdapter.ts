import OpenAI from 'openai'
import {
  ChatCompletion,
  ChatCompletionChunk,
} from 'openai/resources/chat/completions'

import {
  LLMOptions,
  LLMRequestNonStreaming,
  LLMRequestStreaming,
} from '../../types/llm/request'
import {
  LLMResponseNonStreaming,
  LLMResponseStreaming,
} from '../../types/llm/response'

import { OpenAIMessageAdapter } from './openaiMessageAdapter'

/**
 * Adapter for DeepSeek's API that extends OpenAIMessageAdapter to handle the additional
 * 'reasoning_content' field in DeepSeek's response format while maintaining OpenAI compatibility.
 */
export class DeepSeekMessageAdapter extends OpenAIMessageAdapter {
  async generateResponse(
    client: OpenAI,
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    const response = await client.chat.completions.create(
      {
        model: request.model,
        messages: request.messages.map((m) =>
          DeepSeekMessageAdapter.parseRequestMessage(m),
        ),
        max_tokens: request.max_tokens,
        temperature: request.temperature,
        top_p: request.top_p,
        frequency_penalty: request.frequency_penalty,
        presence_penalty: request.presence_penalty,
        logit_bias: request.logit_bias,
        prediction: request.prediction,
      },
      {
        signal: options?.signal,
      },
    )
    return DeepSeekMessageAdapter.parseNonStreamingResponse(response)
  }

  async streamResponse(
    client: OpenAI,
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    const stream = await client.chat.completions.create(
      {
        model: request.model,
        messages: request.messages.map((m) =>
          DeepSeekMessageAdapter.parseRequestMessage(m),
        ),
        max_completion_tokens: request.max_tokens,
        temperature: request.temperature,
        top_p: request.top_p,
        frequency_penalty: request.frequency_penalty,
        presence_penalty: request.presence_penalty,
        logit_bias: request.logit_bias,
        stream: true,
        stream_options: {
          include_usage: true,
        },
      },
      {
        signal: options?.signal,
      },
    )

    // eslint-disable-next-line no-inner-declarations
    async function* streamResponse(): AsyncIterable<LLMResponseStreaming> {
      for await (const chunk of stream) {
        yield DeepSeekMessageAdapter.parseStreamingResponseChunk(chunk)
      }
    }

    return streamResponse()
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
          reasoning: (
            choice.message as unknown as { reasoning_content: string }
          ).reasoning_content,
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
          reasoning: (choice.delta as unknown as { reasoning_content: string })
            .reasoning_content,
          role: choice.delta.role,
        },
      })),
      created: chunk.created,
      model: chunk.model,
      object: 'chat.completion.chunk',
      system_fingerprint: chunk.system_fingerprint,
      usage: chunk.usage ?? undefined,
    }
  }
}
