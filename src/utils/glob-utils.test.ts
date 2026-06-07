import { getExcludePatternForPath } from './glob-utils'

describe('getExcludePatternForPath', () => {
  it('returns the exact path for a file', () => {
    expect(getExcludePatternForPath('notes/todo.md', false)).toBe(
      'notes/todo.md',
    )
  })

  it('appends a recursive glob for a folder', () => {
    expect(getExcludePatternForPath('Archive', true)).toBe('Archive/**')
  })

  it('appends a recursive glob for a nested folder', () => {
    expect(getExcludePatternForPath('Work/Private', true)).toBe(
      'Work/Private/**',
    )
  })
})
