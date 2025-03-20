import { chunkArray } from './chunk-array'

describe('chunkArray', () => {
  it('should split array into chunks of specified size', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8]
    const size = 3
    const expected = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8],
    ]

    const result = chunkArray(input, size)
    expect(result).toEqual(expected)
  })

  it('should handle empty array', () => {
    const input: number[] = []
    const size = 2
    const expected: number[][] = []

    const result = chunkArray(input, size)
    expect(result).toEqual(expected)
  })

  it('should handle array smaller than chunk size', () => {
    const input = ['a', 'b']
    const size = 5
    const expected = [['a', 'b']]

    const result = chunkArray(input, size)
    expect(result).toEqual(expected)
  })

  it('should handle array equal to chunk size', () => {
    const input = [1, 2, 3]
    const size = 3
    const expected = [[1, 2, 3]]

    const result = chunkArray(input, size)
    expect(result).toEqual(expected)
  })
})
