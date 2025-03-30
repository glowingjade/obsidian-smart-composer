import React, { useCallback, useMemo } from 'react'
import Markdown from 'react-markdown'

import { ChatMessage } from '../../types/chat'
import {
  ParsedSmtcmpBlock,
  parsesmtcmpBlocks,
} from '../../utils/chat/parse-smtcmp-block'

import MarkdownCodeComponent from './MarkdownCodeComponent'
import MarkdownReferenceBlock from './MarkdownReferenceBlock'

const ReactMarkdown = React.memo(function ReactMarkdown({
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
        ) : block.startLine && block.endLine && block.filename ? (
          <MarkdownReferenceBlock
            key={index}
            filename={block.filename}
            startLine={block.startLine}
            endLine={block.endLine}
          />
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
})

export function ReactMarkdownItem({
  index,
  chatMessages,
  handleApply,
  isApplying,
  children,
}: {
  index: number
  chatMessages: ChatMessage[]
  handleApply: (blockToApply: string, chatMessages: ChatMessage[]) => void
  isApplying: boolean
  children: string
}) {
  const onApply = useCallback(
    (blockToApply: string) => {
      handleApply(blockToApply, chatMessages.slice(0, index + 1))
    },
    [handleApply, chatMessages, index],
  )

  return (
    <ReactMarkdown onApply={onApply} isApplying={isApplying}>
      {children}
    </ReactMarkdown>
  )
}
