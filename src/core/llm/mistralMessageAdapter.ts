import { ChatCompletionCreateParamsNonStreaming } from 'openai/resources'
import { ChatCompletionCreateParamsStreaming } from 'openai/resources/chat/completions'

import { LLMRequest } from '../../types/llm/request'

import { OpenAIMessageAdapter } from './openaiMessageAdapter'

/**
 * Mistral's API is not compatible with the `stream_options` parameter.
 * This adapter overrides the default behavior to exclude `stream_options`
 * from streaming requests, preventing errors when using Mistral models.
 */
export class MistralMessageAdapter extends OpenAIMessageAdapter {
  protected override buildChatCompletionCreateParams(params: {
    request: LLMRequest
    stream: true
  }): ChatCompletionCreateParamsStreaming
  protected override buildChatCompletionCreateParams(params: {
    request: LLMRequest
    stream: false
  }): ChatCompletionCreateParamsNonStreaming
  protected override buildChatCompletionCreateParams({
    request,
    stream,
  }: {
    request: LLMRequest
    stream: boolean
  }):
    | ChatCompletionCreateParamsStreaming
    | ChatCompletionCreateParamsNonStreaming {
    return {
      model: request.model,
      tools: request.tools,
      tool_choice: request.tool_choice,
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
      ...(stream && {
        stream: true,
        // Omit stream_options for Mistral to prevent API errors.
      }),
    }
  }
}
