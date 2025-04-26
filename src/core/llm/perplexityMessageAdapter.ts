import {
  ChatCompletion,
  ChatCompletionChunk,
} from 'openai/resources/chat/completions'

import {
  Annotation,
  LLMResponseNonStreaming,
  LLMResponseStreaming,
} from '../../types/llm/response'

import { OpenAIMessageAdapter } from './openaiMessageAdapter'

/**
 * Adapter for Perplexity's API that extends OpenAIMessageAdapter to handle the additional
 * citations field in Perplexity's response format.
 * @see https://docs.perplexity.ai/guides/models/sonar
 */

type PerplexityChatCompletion = ChatCompletion & {
  citations?: string[] // an array of URLs
}

type PerplexityChatCompletionChunk = ChatCompletionChunk & {
  citations?: string[] // an array of URLs
}

export class PerplexityMessageAdapter extends OpenAIMessageAdapter {
  protected parseNonStreamingResponse(
    response: ChatCompletion,
  ): LLMResponseNonStreaming {
    const annotations: Annotation[] | undefined = (
      response as unknown as PerplexityChatCompletion
    ).citations?.map((url) => ({
      type: 'url_citation',
      url_citation: { url },
    }))

    return {
      id: response.id,
      choices: response.choices.map((choice) => ({
        finish_reason: choice.finish_reason,
        message: {
          content: choice.message.content,
          role: choice.message.role,
          annotations: annotations,
          tool_calls: choice.message.tool_calls,
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
    const annotations: Annotation[] | undefined = (
      chunk as unknown as PerplexityChatCompletionChunk
    ).citations?.map((url) => ({
      type: 'url_citation',
      url_citation: { url },
    }))

    return {
      id: chunk.id,
      choices: chunk.choices.map((choice) => ({
        finish_reason: choice.finish_reason ?? null,
        delta: {
          content: choice.delta.content ?? null,
          role: choice.delta.role,
          annotations: annotations,
          tool_calls: choice.delta.tool_calls,
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
