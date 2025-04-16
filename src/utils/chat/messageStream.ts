import { BaseLLMProvider } from '../../core/llm/base'
import { ChatAssistantMessage } from '../../types/chat'
import { ChatModel } from '../../types/chat-model.types'
import { RequestMessage } from '../../types/llm/request'
import { Annotation, LLMResponseStreaming } from '../../types/llm/response'
import { LLMProvider } from '../../types/provider.types'

import { fetchAnnotationTitles } from './fetch-annotation-titles'

type ChatAssistantMessageData = Omit<ChatAssistantMessage, 'role' | 'id'>

export type MessageStreamParams = {
  providerClient: BaseLLMProvider<LLMProvider>
  model: ChatModel
  requestMessages: RequestMessage[]
  abortSignal?: AbortSignal
}

export class MessageStream {
  private providerClient: BaseLLMProvider<LLMProvider>
  private model: ChatModel
  private requestMessages: RequestMessage[]
  private abortSignal?: AbortSignal

  private subscribers: ((message: ChatAssistantMessageData) => void)[] = []

  // Current state of the message
  private messageSnapshot: ChatAssistantMessageData

  constructor(params: MessageStreamParams) {
    this.providerClient = params.providerClient
    this.model = params.model
    this.requestMessages = params.requestMessages
    this.abortSignal = params.abortSignal
    this.messageSnapshot = {
      content: '',
      metadata: {
        model: this.model,
        usage: undefined,
      },
    }
  }

  public subscribe(callback: (message: ChatAssistantMessageData) => void) {
    this.subscribers.push(callback)
  }

  public async start() {
    const stream = await this.providerClient.streamResponse(
      this.model,
      {
        model: this.model.model,
        messages: this.requestMessages,
        stream: true,
      },
      {
        signal: this.abortSignal,
      },
    )

    for await (const chunk of stream) {
      this.processChunk(chunk)
    }
  }

  private processChunk(chunk: LLMResponseStreaming) {
    const content = chunk.choices[0]?.delta?.content ?? ''
    const reasoning = chunk.choices[0]?.delta?.reasoning
    const annotations = chunk.choices[0]?.delta?.annotations

    if (annotations) {
      // For annotations with empty titles, fetch the title of the URL and update the chat messages
      fetchAnnotationTitles(annotations, (url, title) => {
        this.updateMessageSnapshot((message) => ({
          ...message,
          annotations: message.annotations?.map((a) =>
            a.type === 'url_citation' && a.url_citation.url === url
              ? {
                  ...a,
                  url_citation: {
                    ...a.url_citation,
                    title: title ?? undefined,
                  },
                }
              : a,
          ),
        }))
      })
    }

    this.updateMessageSnapshot((message) => ({
      ...message,
      content: message.content + content,
      reasoning: reasoning
        ? (message.reasoning ?? '') + reasoning
        : message.reasoning,
      annotations: this.mergeAnnotations(message.annotations, annotations),
      metadata: {
        ...message.metadata,
        usage: chunk.usage ?? message.metadata?.usage,
      },
    }))
  }

  private updateMessageSnapshot(
    updaterFunction: (
      message: ChatAssistantMessageData,
    ) => ChatAssistantMessageData,
  ) {
    this.messageSnapshot = updaterFunction(this.messageSnapshot)
    this.notifySubscribers(this.messageSnapshot)
  }

  private notifySubscribers(message: ChatAssistantMessageData) {
    this.subscribers.forEach((callback) => callback(message))
  }

  private mergeAnnotations = (
    prevAnnotations?: Annotation[],
    newAnnotations?: Annotation[],
  ): Annotation[] | undefined => {
    if (!prevAnnotations) return newAnnotations
    if (!newAnnotations) return prevAnnotations

    const mergedAnnotations = [...prevAnnotations]
    for (const newAnnotation of newAnnotations) {
      if (
        !mergedAnnotations.find(
          (annotation) =>
            annotation.url_citation.url === newAnnotation.url_citation.url,
        )
      ) {
        mergedAnnotations.push(newAnnotation)
      }
    }
    return mergedAnnotations
  }
}
