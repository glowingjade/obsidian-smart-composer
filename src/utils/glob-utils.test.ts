import {
  getExcludePatternForPath,
  isHiddenPath,
  isPathIndexable,
} from './glob-utils'

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

describe('isHiddenPath', () => {
  it('detects a top-level hidden folder', () => {
    expect(isHiddenPath('.obsidian/plugins/foo.md')).toBe(true)
  })

  it('detects a nested hidden folder', () => {
    expect(isHiddenPath('notes/.archive/old.md')).toBe(true)
  })

  it('detects a hidden file', () => {
    expect(isHiddenPath('.hidden-note.md')).toBe(true)
  })

  it('returns false for a regular path', () => {
    expect(isHiddenPath('notes/2024/todo.md')).toBe(false)
  })
})

describe('isPathIndexable', () => {
  const base = {
    excludePatterns: [],
    includePatterns: [],
    excludeHiddenFiles: true,
  }

  it('indexes a regular file by default', () => {
    expect(isPathIndexable('notes/todo.md', base)).toBe(true)
  })

  it('excludes hidden files when excludeHiddenFiles is true', () => {
    expect(isPathIndexable('.obsidian/foo.md', base)).toBe(false)
  })

  it('indexes hidden files when excludeHiddenFiles is false', () => {
    expect(
      isPathIndexable('.obsidian/foo.md', {
        ...base,
        excludeHiddenFiles: false,
      }),
    ).toBe(true)
  })

  it('excludes files matching an exclude pattern', () => {
    expect(
      isPathIndexable('Archive/2023/old.md', {
        ...base,
        excludePatterns: ['Archive/**'],
      }),
    ).toBe(false)
  })

  it('only indexes files matching include patterns when set', () => {
    expect(
      isPathIndexable('notes/keep.md', {
        ...base,
        includePatterns: ['notes/**'],
      }),
    ).toBe(true)
    expect(
      isPathIndexable('other/skip.md', {
        ...base,
        includePatterns: ['notes/**'],
      }),
    ).toBe(false)
  })
})
