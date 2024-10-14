import React, { useMemo } from 'react'
import Markdown from 'react-markdown'

import {
  ParsedSmtcmpBlock,
  parsesmtcmpBlocks,
} from '../../utils/parse-smtcmp-block'

import MarkdownCodeComponent from './MarkdownCodeComponent'

function ReactMarkdown({
  onApply,
  isApplying,
  children,
}: {
  onApply: (blockToApply: string) => void
  children: string
  isApplying: boolean
}) {
  const blocks: ParsedSmtcmpBlock[] = useMemo(
    () => parsesmtcmpBlocks(children),
    [children],
  )

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

export default React.memo(ReactMarkdown)
