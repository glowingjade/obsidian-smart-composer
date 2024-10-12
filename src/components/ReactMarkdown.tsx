import Markdown from 'react-markdown'

import MarkdownCodeComponent from './MarkdownCodeComponent'

function parsesmtcmpBlocks(input: string): (
  | { type: 'string'; content: string }
  | {
      type: 'smtcmp_block'
      content: string
      language?: string
      filename?: string
    }
)[] {
  const regex = /<smtcmp_block([^>]*)>\s*([\s\S]*?)\s*(?:<\/smtcmp_block>|$)/g
  const matches = input.matchAll(regex)
  const result: (
    | { type: 'string'; content: string }
    | {
        type: 'smtcmp_block'
        content: string
        language?: string
        filename?: string
      }
  )[] = []

  let lastIndex = 0
  for (const match of matches) {
    if (match.index > lastIndex) {
      result.push({
        type: 'string',
        content: input.slice(lastIndex, match.index),
      })
    }
    const [, attributes, content] = match
    const language = attributes.match(/language="([^"]+)"/)?.[1]
    const filename = attributes.match(/filename="([^"]+)"/)?.[1]
    result.push({
      type: 'smtcmp_block',
      content,
      language,
      filename,
    })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < input.length) {
    result.push({
      type: 'string',
      content: input.slice(lastIndex),
    })
  }

  return result
}

export default function ReactMarkdown({
  onApply,
  isApplying,
  children,
}: {
  onApply: (blockToApply: string) => void
  children: string
  isApplying: boolean
}) {
  const blocks = parsesmtcmpBlocks(children)

  return (
    <>
      {blocks.map((block, index) =>
        block.type === 'string' ? (
          <Markdown key={index} className="smtcmp-markdown">
            {block.content}
          </Markdown>
        ) : (
          <MarkdownCodeComponent
            key={index}
            onApply={onApply}
            isApplying={isApplying}
            language={block.language}
            filename={block.filename}
          >
            {block.content}
          </MarkdownCodeComponent>
        ),
      )}
    </>
  )
}
