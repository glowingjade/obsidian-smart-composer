import { ChatModel } from '../../types/chat-model.types'
import {
  LLMOptions,
  LLMRequestNonStreaming,
  LLMRequestStreaming,
} from '../../types/llm/request'
import {
  LLMResponseNonStreaming,
  LLMResponseStreaming,
} from '../../types/llm/response'
import { LLMProvider } from '../../types/provider.types'

// TODO: do these really have to be class? why not just function?
export abstract class BaseLLMProvider<P extends LLMProvider> {
  protected readonly provider: P
  constructor(provider: P) {
    this.provider = provider
  }

  abstract generateResponse(
    model: ChatModel,
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming>

  abstract streamResponse(
    model: ChatModel,
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>>

  abstract getEmbedding(model: string, text: string): Promise<number[]>
}
