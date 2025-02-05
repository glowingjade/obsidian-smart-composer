import OpenAI from 'openai'

import { ChatModel } from '../../types/chat-model.types'
import {
  ContentPart,
  LLMOptions,
  LLMRequestNonStreaming,
  LLMRequestStreaming,
  RequestMessage,
} from '../../types/llm/request'
import {
  LLMResponseNonStreaming,
  LLMResponseStreaming,
} from '../../types/llm/response'
import { LLMProvider } from '../../types/provider.types'

import { BaseLLMProvider } from './base'
import { OpenAIMessageAdapter } from './openaiMessageAdapter'

// deepseek doesn't support image
export class DeepSeekStudioProvider extends BaseLLMProvider<
  Extract<LLMProvider, { type: 'deepseek' }>
> {
  private adapter: OpenAIMessageAdapter
  private client: OpenAI

  constructor(provider: Extract<LLMProvider, { type: 'deepseek' }>) {
    super(provider)
    this.adapter = new OpenAIMessageAdapter()
    this.client = new OpenAI({
      apiKey: provider.apiKey ?? '',
      baseURL: provider.baseUrl
        ? provider.baseUrl.replace(/\/+$/, '')
        : 'https://api.deepseek.com',
      dangerouslyAllowBrowser: true,
    })
  }

  async generateResponse(
    model: ChatModel,
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (model.providerType !== 'deepseek') {
      throw new Error('Model is not a DeepSeek model')
    }

    const formattedRequest = {
      ...request,
      messages: this.formatMessages(request.messages),
    }

    return this.adapter.generateResponse(this.client, formattedRequest, options)
  }

  async streamResponse(
    model: ChatModel,
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    if (model.providerType !== 'deepseek') {
      throw new Error('Model is not a DeepSeek model')
    }

    const formattedRequest = {
      ...request,
      messages: this.formatMessages(request.messages),
    }

    return this.adapter.streamResponse(this.client, formattedRequest, options)
  }

  async getEmbedding(_model: string, _text: string): Promise<number[]> {
    throw new Error(
      `Provider ${this.provider.id} does not support embeddings. Please use a different provider.`,
    )
  }

  /**
   * Merges two arrays of ContentPart by combining all text parts into one
   * text block (with "\n\n" as the separator) and preserving all non-text parts.
   */
  private mergeContentParts(
    partsA: ContentPart[],
    partsB: ContentPart[],
  ): ContentPart[] {
    const combinedParts = [...partsA, ...partsB]
    const mergedText = combinedParts
      .filter((p) => p.type === 'text')
      .map((p) => p.text)
      .join('\n\n')
    const nonTextParts = combinedParts.filter((p) => p.type !== 'text')
    const merged: ContentPart[] = []
    merged.push(...nonTextParts)
    if (mergedText.trim().length > 0) {
      merged.push({ type: 'text', text: mergedText })
    }
    return merged
  }

  /**
   * Formats the messages to ensure proper alternation between user and
   * assistant messages. It merges consecutive messages of the same role.
   * If a merge involves ContentPart[] and/or string representations,
   * both are first normalized into arrays, then merged so that all text parts are combined.
   *
   * Note: DeepSeek requires strict alternation between user and assistant messages.
   * Consecutive messages of the same role must be merged as the API will reject
   * successive user or assistant messages.
   */
  private formatMessages(messages: RequestMessage[]): RequestMessage[] {
    const formattedMessages: RequestMessage[] = []
    let startIdx = 0

    // Preserve system message if it exists at the beginning
    if (messages.length > 0 && messages[0].role === 'system') {
      formattedMessages.push(messages[0])
      startIdx = 1
    }

    // Iterate over the remaining messages
    for (let i = startIdx; i < messages.length; i++) {
      const currentMessage = messages[i]
      const prevMessage = formattedMessages[formattedMessages.length - 1]

      if (prevMessage && prevMessage.role === currentMessage.role) {
        // If both are plain strings, simply concatenate
        if (
          typeof prevMessage.content === 'string' &&
          typeof currentMessage.content === 'string'
        ) {
          prevMessage.content += '\n\n' + currentMessage.content
        } else {
          // Normalize both contents to ContentPart[]
          const prevParts: ContentPart[] =
            typeof prevMessage.content === 'string'
              ? [{ type: 'text', text: prevMessage.content }]
              : prevMessage.content
          const currParts: ContentPart[] =
            typeof currentMessage.content === 'string'
              ? [{ type: 'text', text: currentMessage.content }]
              : currentMessage.content

          // Merge all text parts (from both arrays) into one text part
          prevMessage.content = this.mergeContentParts(prevParts, currParts)
        }
      } else {
        formattedMessages.push(currentMessage)
      }
    }

    return formattedMessages
  }
}
