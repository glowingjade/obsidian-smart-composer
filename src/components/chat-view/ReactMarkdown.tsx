import React, { useCallback, useMemo } from 'react'

import { ChatMessage } from '../../types/chat'
import {
  ParsedTagContent,
  parseTagContents,
} from '../../utils/chat/parse-tag-content'

import AssistantMessageReasoning from './AssistantMessageReasoning'
import MarkdownCodeComponent from './MarkdownCodeComponent'
import MarkdownReferenceBlock from './MarkdownReferenceBlock'
import ObsidianMarkdown from './ObsidianMarkdown'

const ReactMarkdown = React.memo(function ReactMarkdown({
  onApply,
  isApplying,
  children,
}: {
  onApply: (blockToApply: string) => void
  children: string
  isApplying: boolean
}) {
  const blocks: ParsedTagContent[] = useMemo(
    () => parseTagContents(children),
    [children],
  )

  return (
    <>
      {blocks.map((block, index) =>
        block.type === 'string' ? (
          <div key={index}>
            <ObsidianMarkdown content={block.content} scale="sm" />
          </div>
        ) : block.type === 'think' ? (
          <AssistantMessageReasoning key={index} reasoning={block.content} />
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
