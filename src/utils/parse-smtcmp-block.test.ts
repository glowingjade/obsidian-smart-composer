import { ParsedSmtcmpBlock, parsesmtcmpBlocks } from './parse-smtcmp-block'

describe('parsesmtcmpBlocks', () => {
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

    const expected: ParsedSmtcmpBlock[] = [
      { type: 'string', content: 'Some text before\n' },
      {
        type: 'smtcmp_block',
        content: `
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
`,
        language: 'markdown',
        filename: 'example.md',
      },
      { type: 'string', content: '\nSome text after' },
    ]

    const result = parsesmtcmpBlocks(input)
    expect(result).toEqual(expected)
  })

  it('should handle empty smtcmp_block elements', () => {
    const input = `
      <smtcmp_block language="python"></smtcmp_block>
    `

    const expected: ParsedSmtcmpBlock[] = [
      { type: 'string', content: '\n      ' },
      {
        type: 'smtcmp_block',
        content: '',
        language: 'python',
        filename: undefined,
      },
      { type: 'string', content: '\n    ' },
    ]

    const result = parsesmtcmpBlocks(input)
    expect(result).toEqual(expected)
  })

  it('should handle input without smtcmp_block elements', () => {
    const input = 'Just a regular string without any smtcmp_block elements.'

    const expected: ParsedSmtcmpBlock[] = [{ type: 'string', content: input }]

    const result = parsesmtcmpBlocks(input)
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

    const expected: ParsedSmtcmpBlock[] = [
      { type: 'string', content: 'Start\n' },
      {
        type: 'smtcmp_block',
        content: `
def greet(name):
    print(f"Hello, {name}!")
`,
        language: 'python',
        filename: 'script.py',
      },
      { type: 'string', content: '\nMiddle\n' },
      {
        type: 'smtcmp_block',
        content: `
# Using tildes for code blocks

Did you know that you can use tildes for code blocks?

~~~python
print("Hello, world!")
~~~
`,
        language: 'markdown',
        filename: 'example.md',
      },
      { type: 'string', content: '\nEnd' },
    ]

    const result = parsesmtcmpBlocks(input)
    expect(result).toEqual(expected)
  })

  it('should handle unfinished smtcmp_block with only opening tag', () => {
    const input = `Start
<smtcmp_block language="markdown">
# Unfinished smtcmp_block

Some text after without closing tag`
    const expected: ParsedSmtcmpBlock[] = [
      { type: 'string', content: 'Start\n' },
      {
        type: 'smtcmp_block',
        content: `
# Unfinished smtcmp_block

Some text after without closing tag`,
        language: 'markdown',
        filename: undefined,
      },
    ]

    const result = parsesmtcmpBlocks(input)
    expect(result).toEqual(expected)
  })

  it('should handle smtcmp_block with startline and endline attributes', () => {
    const input = `<smtcmp_block language="markdown" startline="2" endline="5"></smtcmp_block>`
    const expected: ParsedSmtcmpBlock[] = [
      {
        type: 'smtcmp_block',
        content: '',
        language: 'markdown',
        startLine: 2,
        endLine: 5,
      },
    ]

    const result = parsesmtcmpBlocks(input)
    expect(result).toEqual(expected)
  })
})
