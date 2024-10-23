import { getEncoding } from 'js-tiktoken'

// TODO: Replace js-tiktoken with tiktoken library for better performance
// Note: tiktoken uses WebAssembly, requiring esbuild configuration

// Caution: tokenCount is computationally expensive for large inputs.
// Frequent use, especially on large files, may significantly impact performance.
export async function tokenCount(text: string): Promise<number> {
  const encoder = getEncoding('cl100k_base')
  return encoder.encode(text).length
}
