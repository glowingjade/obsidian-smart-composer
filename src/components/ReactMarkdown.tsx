import { parseFragment } from 'parse5'
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
  const parsedResult: (
    | { type: 'string'; content: string }
    | {
        type: 'smtcmp_block'
        content: string
        language?: string
        filename?: string
      }
  )[] = []

  const fragment = parseFragment(input, {
    sourceCodeLocationInfo: true,
  })
  let lastEndOffset = 0
  for (const node of fragment.childNodes) {
    if (node.nodeName === 'smtcmp_block') {
      if (!node.sourceCodeLocation) {
        throw new Error('sourceCodeLocation is undefined')
      }
      const startOffset = node.sourceCodeLocation.startOffset
      const endOffset = node.sourceCodeLocation.endOffset
      if (startOffset > lastEndOffset) {
        parsedResult.push({
          type: 'string',
          content: input.slice(lastEndOffset, startOffset),
        })
      }

      const language = node.attrs.find(
        (attr) => attr.name === 'language',
      )?.value
      const filename = node.attrs.find(
        (attr) => attr.name === 'filename',
      )?.value

      const children = node.childNodes
      if (children.length === 0) {
        parsedResult.push({
          type: 'smtcmp_block',
          content: '',
          language,
          filename,
        })
      } else {
        const innerContentStartOffset =
          children[0].sourceCodeLocation?.startOffset
        const innerContentEndOffset =
          children[children.length - 1].sourceCodeLocation?.endOffset
        if (!innerContentStartOffset || !innerContentEndOffset) {
          throw new Error('sourceCodeLocation is undefined')
        }
        parsedResult.push({
          type: 'smtcmp_block',
          content: input.slice(innerContentStartOffset, innerContentEndOffset),
          language,
          filename,
        })
      }
      lastEndOffset = endOffset
    }
  }
  if (lastEndOffset < input.length) {
    parsedResult.push({
      type: 'string',
      content: input.slice(lastEndOffset),
    })
  }
  return parsedResult
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
