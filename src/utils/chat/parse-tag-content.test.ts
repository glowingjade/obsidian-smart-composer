import { ParsedTagContent, parseTagContents } from './parse-tag-content'

describe('parseSmtcmpBlocks', () => {
  it('should parse a string with smtcmp_block elements', () => {
    const input = `Some text before
<smtcmp_block language="markdown" filename="example.md">
# Example Markdown

This is a sample markdown content for testing purposes.

## Features

- Lists
- **Bold text**
- *Italic text*
- [Links](https://example.com)

### Code Block
\`\`\`python
print("Hello, world!")
\`\`\`
</smtcmp_block>
Some text after`

    const expected: ParsedTagContent[] = [
      { type: 'string', content: 'Some text before' },
      {
        type: 'smtcmp_block',
        content: `# Example Markdown

This is a sample markdown content for testing purposes.

## Features

- Lists
- **Bold text**
- *Italic text*
- [Links](https://example.com)

### Code Block
\`\`\`python
print("Hello, world!")
\`\`\``,
        language: 'markdown',
        filename: 'example.md',
      },
      { type: 'string', content: 'Some text after' },
    ]

    const result = parseTagContents(input)
    expect(result).toEqual(expected)
  })

  it('should handle empty smtcmp_block elements', () => {
    const input = `
      <smtcmp_block language="python"></smtcmp_block>
    `

    const expected: ParsedTagContent[] = [
      { type: 'string', content: '      ' },
      {
        type: 'smtcmp_block',
        content: '',
        language: 'python',
        filename: undefined,
      },
      { type: 'string', content: '    ' },
    ]

    const result = parseTagContents(input)
    expect(result).toEqual(expected)
  })

  it('should handle input without smtcmp_block elements', () => {
    const input = 'Just a regular string without any smtcmp_block elements.'

    const expected: ParsedTagContent[] = [{ type: 'string', content: input }]

    const result = parseTagContents(input)
    expect(result).toEqual(expected)
  })

  it('should handle multiple smtcmp_block elements', () => {
    const input = `Start
<smtcmp_block language="python" filename="script.py">
def greet(name):
    print(f"Hello, {name}!")
</smtcmp_block>
Middle
<smtcmp_block language="markdown" filename="example.md">
# Using tildes for code blocks

Did you know that you can use tildes for code blocks?

~~~python
print("Hello, world!")
~~~
</smtcmp_block>
End`

    const expected: ParsedTagContent[] = [
      { type: 'string', content: 'Start' },
      {
        type: 'smtcmp_block',
        content: `def greet(name):
    print(f"Hello, {name}!")`,
        language: 'python',
        filename: 'script.py',
      },
      { type: 'string', content: 'Middle' },
      {
        type: 'smtcmp_block',
        content: `# Using tildes for code blocks

Did you know that you can use tildes for code blocks?

~~~python
print("Hello, world!")
~~~`,
        language: 'markdown',
        filename: 'example.md',
      },
      { type: 'string', content: 'End' },
    ]

    const result = parseTagContents(input)
    expect(result).toEqual(expected)
  })

  it('should handle unfinished smtcmp_block with only opening tag', () => {
    const input = `Start
<smtcmp_block language="markdown">
# Unfinished smtcmp_block

Some text after without closing tag`
    const expected: ParsedTagContent[] = [
      { type: 'string', content: 'Start' },
      {
        type: 'smtcmp_block',
        content: `# Unfinished smtcmp_block

Some text after without closing tag`,
        language: 'markdown',
        filename: undefined,
      },
    ]

    const result = parseTagContents(input)
    expect(result).toEqual(expected)
  })

  it('should handle smtcmp_block with startline and endline attributes', () => {
    const input = `<smtcmp_block language="markdown" startline="2" endline="5"></smtcmp_block>`
    const expected: ParsedTagContent[] = [
      {
        type: 'smtcmp_block',
        content: '',
        language: 'markdown',
        startLine: 2,
        endLine: 5,
      },
    ]

    const result = parseTagContents(input)
    expect(result).toEqual(expected)
  })
})

describe('parseThink', () => {
  it('should parse a string with think elements', () => {
    const input = `Start
<think>Thinking...</think>
End`
    const expected: ParsedTagContent[] = [
      { type: 'string', content: 'Start' },
      { type: 'think', content: 'Thinking...' },
      { type: 'string', content: 'End' },
    ]

    const result = parseTagContents(input)
    expect(result).toEqual(expected)
  })

  it('should handle unfinished think with only opening tag', () => {
    const input = `Start
<think>Thinking...
Some text after without closing tag`
    const expected: ParsedTagContent[] = [
      { type: 'string', content: 'Start' },
      {
        type: 'think',
        content: 'Thinking...\nSome text after without closing tag',
      },
    ]

    const result = parseTagContents(input)
    expect(result).toEqual(expected)
  })

  it('should handle multiple think elements', () => {
    const input = `Start
<think>First thought</think>
Some text after
<think>Second thought</think>
End`
    const expected: ParsedTagContent[] = [
      { type: 'string', content: 'Start' },
      { type: 'think', content: 'First thought' },
      { type: 'string', content: 'Some text after' },
      { type: 'think', content: 'Second thought' },
      { type: 'string', content: 'End' },
    ]

    const result = parseTagContents(input)
    expect(result).toEqual(expected)
  })
})

describe('parseSmtcmpBlockAndThink', () => {
  it('should parse a string with smtcmp_block and think elements', () => {
    const input = `Start
<think>Thinking...</think>

<smtcmp_block language="markdown" filename="example.md">
# Example Markdown

This is a sample markdown content for testing purposes.

## Features

- Lists
- **Bold text**
- *Italic text*
- [Links](https://example.com)
</smtcmp_block>
End`

    const expected: ParsedTagContent[] = [
      { type: 'string', content: 'Start' },
      { type: 'think', content: 'Thinking...' },
      { type: 'string', content: '' },
      {
        type: 'smtcmp_block',
        content: `# Example Markdown

This is a sample markdown content for testing purposes.

## Features

- Lists
- **Bold text**
- *Italic text*
- [Links](https://example.com)`,
        language: 'markdown',
        filename: 'example.md',
        startLine: undefined,
        endLine: undefined,
      },
      { type: 'string', content: 'End' },
    ]

    const result = parseTagContents(input)
    expect(result).toEqual(expected)
  })

  it('should handle nested smtcmp_block and think elements', () => {
    const input = `Start
<think>Thinking...
<smtcmp_block language="markdown" filename="example.md">
# Example Markdown

This is a sample markdown content for testing purposes.

## Features
</smtcmp_block>
</think>
End`
    const expected: ParsedTagContent[] = [
      { type: 'string', content: 'Start' },
      {
        type: 'think',
        content: `Thinking...
<smtcmp_block language="markdown" filename="example.md">
# Example Markdown

This is a sample markdown content for testing purposes.

## Features
</smtcmp_block>`,
      },
      { type: 'string', content: 'End' },
    ]

    const result = parseTagContents(input)
    expect(result).toEqual(expected)
  })
})
