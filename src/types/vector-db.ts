export type VectorData = {
  path: string
  mtime: number
  content: string
  embedding: number[]
  metadata: {
    startLine: number // 1-indexed, inclusive
    endLine: number // 1-indexed, inclusive
  }
}
