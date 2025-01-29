export function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []

  for (let i = 0; i < arr.length; i += size) {
    // Use slice to grab the batch from i to i + size
    const chunk = arr.slice(i, i + size)
    result.push(chunk)
  }

  return result
}
