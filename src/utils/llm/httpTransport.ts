/*
 * Codex endpoints block direct fetch with CORS, so we use Node's http/https on
 * desktop. Obsidian's requestUrl can bypass CORS but does not support streaming
 * today; Codex requires stream: true, so a non-streaming fallback needs more
 * work and is not worth it for now. Mobile has no Node APIs, so Node modules are
 * loaded at runtime only when running on desktop.
 */
import type { IncomingMessage } from 'http'

import { Platform } from 'obsidian'

export type StreamSource = ReadableStream<Uint8Array> | NodeJS.ReadableStream

type PostOptions = {
  headers?: Record<string, string>
  signal?: AbortSignal
  fetchFn?: typeof fetch
}

export async function postJson<T>(
  endpoint: string,
  body: unknown,
  options: PostOptions = {},
): Promise<T> {
  const { headers, signal, fetchFn } = options
  const payload = JSON.stringify(body)

  if (fetchFn) {
    const response = await fetchFn(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(headers ?? {}),
      },
      body: payload,
      signal,
    })

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`)
    }

    return (await response.json()) as T
  }

  const response = await nodePost(endpoint, payload, headers, signal)
  const status = response.statusCode ?? 0
  const responseBody = await readStreamToString(response)
  if (status < 200 || status >= 300) {
    throw new Error(`Request failed: ${status} ${responseBody}`)
  }

  return JSON.parse(responseBody) as T
}

export async function postStream(
  endpoint: string,
  body: unknown,
  options: PostOptions = {},
): Promise<StreamSource> {
  const { headers, signal, fetchFn } = options
  const payload = JSON.stringify(body)

  if (fetchFn) {
    const response = await fetchFn(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(headers ?? {}),
      },
      body: payload,
      signal,
    })

    if (!response.ok || !response.body) {
      throw new Error(`Request failed: ${response.status}`)
    }

    return response.body
  }

  const response = await nodePost(endpoint, payload, headers, signal)
  const status = response.statusCode ?? 0
  if (status < 200 || status >= 300) {
    const responseBody = await readStreamToString(response)
    throw new Error(`Request failed: ${status} ${responseBody}`)
  }

  return response
}

async function nodePost(
  endpoint: string,
  body: string,
  headers?: Record<string, string>,
  signal?: AbortSignal,
): Promise<IncomingMessage> {
  if (!Platform.isDesktop) {
    throw new Error('HTTP transport is not available on mobile')
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const http = require('http') as typeof import('http')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const https = require('https') as typeof import('https')
  const url = new URL(endpoint)
  const client = url.protocol === 'https:' ? https : http
  const payloadLength = Buffer.byteLength(body)
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Content-Length': payloadLength.toString(),
    ...(headers ?? {}),
  }

  return new Promise((resolve, reject) => {
    const request = client.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port ? Number(url.port) : undefined,
        path: `${url.pathname}${url.search}`,
        method: 'POST',
        headers: requestHeaders,
      },
      (response) => {
        resolve(response)
      },
    )

    request.on('error', (error) => {
      reject(error)
    })

    if (signal) {
      if (signal.aborted) {
        request.destroy(new Error('Request aborted'))
        return
      }
      const abortHandler = () => {
        request.destroy(new Error('Request aborted'))
      }
      signal.addEventListener('abort', abortHandler, { once: true })
      request.on('close', () => {
        signal.removeEventListener('abort', abortHandler)
      })
    }

    request.write(body)
    request.end()
  })
}

async function readStreamToString(
  stream: NodeJS.ReadableStream,
): Promise<string> {
  const chunks: Uint8Array[] = []
  for await (const chunk of stream) {
    if (typeof chunk === 'string') {
      chunks.push(Buffer.from(chunk))
    } else {
      chunks.push(chunk as Uint8Array)
    }
  }
  return Buffer.concat(chunks).toString('utf8')
}
