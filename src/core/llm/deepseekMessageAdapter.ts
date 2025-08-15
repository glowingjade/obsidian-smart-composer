import {
  ChatCompletion,
  ChatCompletionChunk,
} from 'openai/resources/chat/completions'

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
  protected parseNonStreamingResponse(
    response: ChatCompletion,
  ): LLMResponseNonStreaming {
    return {
      id: response.id,
      choices: response.choices.map((choice) => ({
        finish_reason: choice.finish_reason,
        message: {
          content: choice.message.content,
          reasoning: (
            choice.message as unknown as { reasoning_content?: string }
          ).reasoning_content,
          role: choice.message.role,
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
    return {
      id: chunk.id,
      choices: chunk.choices.map((choice) => ({
        finish_reason: choice.finish_reason ?? null,
        delta: {
          content: choice.delta.content ?? null,
          reasoning: (choice.delta as unknown as { reasoning_content?: string })
            .reasoning_content,
          role: choice.delta.role,
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
