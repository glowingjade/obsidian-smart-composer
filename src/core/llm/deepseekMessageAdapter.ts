import {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions'

import { RequestMessage } from '../../types/llm/request'
import {
  LLMResponseNonStreaming,
  LLMResponseStreaming,
} from '../../types/llm/response'

import { OpenAIMessageAdapter } from './openaiMessageAdapter'

/**
 * Adapter for DeepSeek's API that extends OpenAIMessageAdapter to handle the additional
 * 'reasoning_content' field in DeepSeek's response format while maintaining OpenAI compatibility.
 *
 * DeepSeek's thinking mode requires `reasoning_content` to be passed back in assistant messages
 * during tool call iterations. This adapter stores reasoning in providerMetadata and injects it
 * back into API requests.
 */
export class DeepSeekMessageAdapter extends OpenAIMessageAdapter {
  protected parseNonStreamingResponse(
    response: ChatCompletion,
  ): LLMResponseNonStreaming {
    return {
      id: response.id,
      choices: response.choices.map((choice) => {
        const reasoningContent = (
          choice.message as unknown as { reasoning_content?: string }
        ).reasoning_content
        return {
          finish_reason: choice.finish_reason,
          message: {
            content: choice.message.content,
            reasoning: reasoningContent,
            role: choice.message.role,
            tool_calls: choice.message.tool_calls,
            providerMetadata: reasoningContent
              ? { deepseek: { reasoningContent } }
              : undefined,
          },
        }
      }),
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
      choices: chunk.choices.map((choice) => {
        const reasoningContent = (
          choice.delta as unknown as { reasoning_content?: string }
        ).reasoning_content
        return {
          finish_reason: choice.finish_reason ?? null,
          delta: {
            content: choice.delta.content ?? null,
            reasoning: reasoningContent,
            role: choice.delta.role,
            tool_calls: choice.delta.tool_calls,
            providerMetadata: reasoningContent
              ? { deepseek: { reasoningContent } }
              : undefined,
          },
        }
      }),
      created: chunk.created,
      model: chunk.model,
      object: 'chat.completion.chunk',
      system_fingerprint: chunk.system_fingerprint,
      usage: chunk.usage ?? undefined,
    }
  }

  protected parseRequestMessage(
    message: RequestMessage,
  ): ChatCompletionMessageParam {
    const baseMessage = super.parseRequestMessage(message)

    if (
      message.role === 'assistant' &&
      message.providerMetadata?.deepseek?.reasoningContent
    ) {
      return {
        ...baseMessage,
        reasoning_content: message.providerMetadata.deepseek.reasoningContent,
      } as unknown as ChatCompletionMessageParam
    }

    return baseMessage
  }
}
