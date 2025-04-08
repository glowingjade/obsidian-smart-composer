import { ChatMessage } from '../../types/chat'
import { Annotation } from '../../types/llm/response'
import { fetchUrlTitle } from '../../utils/fetch-utils'

export class AnnotationManager {
  private urlTitleCache: Map<
    string,
    | { status: 'pending' }
    | { status: 'fetched'; title: string | null }
    | {
        status: 'error'
      }
  >

  constructor() {
    this.urlTitleCache = new Map()
  }

  static mergeAnnotations = (
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

  /**
   * Fetches the titles of the URLs in the annotations and updates the chat messages
   */
  async fetchUrlTitles(
    annotations: Annotation[],
    setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
    responseMessageId: string,
  ) {
    annotations
      .filter(
        (annotation) =>
          annotation.type === 'url_citation' && !annotation.url_citation.title,
      )
      .forEach((annotation) => {
        const url = annotation.url_citation.url
        if (this.urlTitleCache.has(url)) {
          const cached = this.urlTitleCache.get(url)
          if (cached?.status === 'fetched') {
            annotation.url_citation.title = cached.title ?? undefined
          }
        } else {
          this.urlTitleCache.set(url, { status: 'pending' })
          fetchUrlTitle(url)
            .then((title) => {
              this.urlTitleCache.set(url, { status: 'fetched', title })
              setChatMessages((prevChatHistory) =>
                prevChatHistory.map((message) =>
                  message.role === 'assistant' &&
                  message.id === responseMessageId &&
                  message.annotations
                    ? {
                        ...message,
                        annotations: message.annotations.map((a) =>
                          a.type === 'url_citation' &&
                          a.url_citation.url === url
                            ? {
                                ...a,
                                url_citation: {
                                  ...a.url_citation,
                                  title: title ?? undefined,
                                },
                              }
                            : a,
                        ),
                      }
                    : message,
                ),
              )
            })
            .catch(() => {
              this.urlTitleCache.set(url, { status: 'error' })
            })
        }
      })
  }
}
