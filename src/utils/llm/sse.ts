import type { StreamSource } from './httpTransport'

type SseBoundary = {
  index: number
  length: number
}

export async function* parseJsonSseStream<T>(
  body: StreamSource,
): AsyncIterable<T> {
  const decoder = new TextDecoder()
  let buffer = ''

  if (isWebReadableStream(body)) {
    const reader = body.getReader()
    while (true) {
      const { value, done } = await reader.read()
      if (value) {
        buffer += decoder.decode(value, { stream: true })
      }
      yield* flushSseBuffer(buffer, (next) => {
        buffer = next
      })
      if (done) {
        break
      }
    }
    yield* flushSseBuffer(
      buffer,
      (next) => {
        buffer = next
      },
      true,
    )
    return
  }

  for await (const chunk of body) {
    const chunkText =
      typeof chunk === 'string' ? chunk : decoder.decode(chunk as Uint8Array)
    buffer += chunkText
    yield* flushSseBuffer(buffer, (next) => {
      buffer = next
    })
  }
  yield* flushSseBuffer(
    buffer,
    (next) => {
      buffer = next
    },
    true,
  )
}

function isWebReadableStream(
  body: StreamSource,
): body is ReadableStream<Uint8Array> {
  return typeof (body as ReadableStream<Uint8Array>).getReader === 'function'
}

function findSseBoundary(buffer: string): SseBoundary | null {
  const candidates: SseBoundary[] = []
  const lfIndex = buffer.indexOf('\n\n')
  if (lfIndex !== -1) {
    candidates.push({ index: lfIndex, length: 2 })
  }
  const crIndex = buffer.indexOf('\r\r')
  if (crIndex !== -1) {
    candidates.push({ index: crIndex, length: 2 })
  }
  const crlfIndex = buffer.indexOf('\r\n\r\n')
  if (crlfIndex !== -1) {
    candidates.push({ index: crlfIndex, length: 4 })
  }
  if (candidates.length === 0) {
    return null
  }
  return candidates.reduce((earliest, candidate) =>
    candidate.index < earliest.index ? candidate : earliest,
  )
}

function* flushSseBuffer<T>(
  buffer: string,
  updateBuffer: (next: string) => void,
  flushPartial = false,
): Iterable<T> {
  let boundary = findSseBoundary(buffer)
  while (boundary) {
    const rawEvent = buffer.slice(0, boundary.index)
    buffer = buffer.slice(boundary.index + boundary.length)
    yield* parseSseEvent<T>(rawEvent)
    boundary = findSseBoundary(buffer)
  }
  if (flushPartial && buffer.length > 0) {
    yield* parseSseEvent<T>(buffer)
    buffer = ''
  }
  updateBuffer(buffer)
}

function* parseSseEvent<T>(rawEvent: string): Iterable<T> {
  const dataLines = rawEvent
    .split(/\r\n|\n|\r/)
    .filter((line) => line.startsWith('data:'))
  if (dataLines.length === 0) {
    return
  }
  const data = dataLines.map((line) => line.replace(/^data:\s?/, '')).join('\n')
  if (data && !data.startsWith('[DONE]')) {
    yield JSON.parse(data) as T
  }
}
