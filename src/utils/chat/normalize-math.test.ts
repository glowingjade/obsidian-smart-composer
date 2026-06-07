import { normalizeMathDelimiters } from './normalize-math'

describe('normalizeMathDelimiters', () => {
  it('converts inline LaTeX delimiters to Obsidian delimiters', () => {
    expect(
      normalizeMathDelimiters('The value \\(x^2 + 1\\) is positive.'),
    ).toBe('The value $x^2 + 1$ is positive.')
  })

  it('converts block LaTeX delimiters to Obsidian delimiters', () => {
    expect(normalizeMathDelimiters('\\[E = mc^2\\]')).toBe('$$E = mc^2$$')
  })

  it('converts multiline block math', () => {
    const input = '\\[\na^2 + b^2 = c^2\n\\]'
    expect(normalizeMathDelimiters(input)).toBe('$$\na^2 + b^2 = c^2\n$$')
  })

  it('handles multiple math expressions in one string', () => {
    const input = 'First \\(a\\) then \\(b\\) and finally \\[c\\].'
    expect(normalizeMathDelimiters(input)).toBe(
      'First $a$ then $b$ and finally $$c$$.',
    )
  })

  it('leaves content without LaTeX delimiters unchanged', () => {
    const input = 'Just some text with $existing$ math and no conversions.'
    expect(normalizeMathDelimiters(input)).toBe(input)
  })

  it('does not convert delimiters inside inline code spans', () => {
    const input = 'Use `\\(x\\)` to write inline math.'
    expect(normalizeMathDelimiters(input)).toBe(input)
  })

  it('does not convert delimiters inside fenced code blocks', () => {
    const input = ['```latex', '\\(x^2\\)', '\\[y^2\\]', '```'].join('\n')
    expect(normalizeMathDelimiters(input)).toBe(input)
  })

  it('converts prose around code blocks but not inside them', () => {
    const input = [
      'Inline \\(a\\) before.',
      '```',
      '\\(b\\)',
      '```',
      'After \\(c\\).',
    ].join('\n')
    const expected = [
      'Inline $a$ before.',
      '```',
      '\\(b\\)',
      '```',
      'After $c$.',
    ].join('\n')
    expect(normalizeMathDelimiters(input)).toBe(expected)
  })

  it('preserves inner whitespace of the math expression', () => {
    expect(normalizeMathDelimiters('\\( x + y \\)')).toBe('$ x + y $')
  })
})
