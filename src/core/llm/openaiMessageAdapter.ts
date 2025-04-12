import OpenAI from 'openai'
import {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionContentPart,
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

export class OpenAIMessageAdapter {
  async generateResponse(
    client: OpenAI,
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    const response = await client.chat.completions.create(
      {
        model: request.model,
        reasoning_effort: request.reasoning_effort,
        web_search_options: request.web_search_options,
        messages: request.messages.map((m) => this.parseRequestMessage(m)),
        // TODO: max_tokens is deprecated in the OpenAI API, with max_completion_tokens being the
        // recommended replacement. Reasoning models do not support max_tokens at all.
        // However, many OpenAI-compatible APIs still only support max_tokens.
        // Consider implementing a solution that works with both OpenAI and compatible APIs.
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
    return this.parseNonStreamingResponse(response)
  }

  async streamResponse(
    client: OpenAI,
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    const stream = await client.chat.completions.create(
      {
        model: request.model,
        reasoning_effort: request.reasoning_effort,
        web_search_options: request.web_search_options,
        messages: request.messages.map((m) => this.parseRequestMessage(m)),
        // TODO: max_tokens is deprecated in the OpenAI API, with max_completion_tokens being the
        // recommended replacement. Reasoning models do not support max_tokens at all.
        // However, many OpenAI-compatible APIs still only support max_tokens.
        // Consider implementing a solution that works with both OpenAI and compatible APIs.
        max_tokens: request.max_tokens,
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

    return this.streamResponseGenerator(stream)
  }

  private async *streamResponseGenerator(
    stream: AsyncIterable<ChatCompletionChunk>,
  ): AsyncIterable<LLMResponseStreaming> {
    for await (const chunk of stream) {
      yield this.parseStreamingResponseChunk(chunk)
    }
  }

  protected parseRequestMessage(
    message: RequestMessage,
  ): ChatCompletionMessageParam {
    switch (message.role) {
      case 'user': {
        const content = Array.isArray(message.content)
          ? message.content.map((part): ChatCompletionContentPart => {
              switch (part.type) {
                case 'text':
                  return { type: 'text', text: part.text }
                case 'image_url':
                  return { type: 'image_url', image_url: part.image_url }
              }
            })
          : message.content
        return { role: 'user', content }
      }
      case 'assistant': {
        if (Array.isArray(message.content)) {
          throw new Error('Assistant message should be a string')
        }
        return { role: 'assistant', content: message.content }
      }
      case 'system': {
        if (Array.isArray(message.content)) {
          throw new Error('System message should be a string')
        }
        return { role: 'system', content: message.content }
      }
    }
  }

  protected parseNonStreamingResponse(
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

  protected parseStreamingResponseChunk(
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
      usage: chunk.usage ?? undefined,
    }
  }
}
