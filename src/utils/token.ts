import { getEncoding } from 'js-tiktoken'

import { ResponseUsage } from '../types/llm/response'

// TODO: Replace js-tiktoken with tiktoken library for better performance
// Note: tiktoken uses WebAssembly, requiring esbuild configuration

// Caution: tokenCount is computationally expensive for large inputs.
// Frequent use, especially on large files, may significantly impact performance.
export async function tokenCount(text: string): Promise<number> {
  const encoder = getEncoding('cl100k_base')
  return encoder.encode(text).length
}

export function sumTokenUsages(
  usages: (ResponseUsage | undefined)[],
): ResponseUsage | undefined {
  return usages.reduce((total, current) => {
    if (!total && !current) return undefined // If both are undefined, return undefined
    if (!total) return current
    if (!current) return total

    return {
      prompt_tokens: total.prompt_tokens + current.prompt_tokens,
      completion_tokens: total.completion_tokens + current.completion_tokens,
      total_tokens: total.total_tokens + current.total_tokens,
    }
  })
}
