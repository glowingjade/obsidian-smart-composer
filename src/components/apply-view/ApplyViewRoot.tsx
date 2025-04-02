import { CheckIcon, X } from 'lucide-react'
import { getIcon } from 'obsidian'
import { useState } from 'react'

import { ApplyViewState } from '../../ApplyView'
import { useApp } from '../../contexts/app-context'
import { DiffBlock, createDiffBlocks } from '../../utils/chat/diff'

export default function ApplyViewRoot({
  state,
  close,
}: {
  state: ApplyViewState
  close: () => void
}) {
  const acceptIcon = getIcon('check')
  const rejectIcon = getIcon('x')

  const app = useApp()

  const [diff, setDiff] = useState<DiffBlock[]>(
    createDiffBlocks(state.originalContent, state.newContent),
  )

  const handleAccept = async () => {
    const newContent = diff
      .map((diffBlock) => {
        if (diffBlock.type === 'modified') {
          return diffBlock.modifiedValue
        } else {
          return diffBlock.value
        }
      })
      .join('\n')
    await app.vault.modify(state.file, newContent)
    close()
  }

  const handleReject = async () => {
    close()
  }

  const rejectDiffBlock = (index: number) => {
    setDiff((prevDiff) => {
      const currentBlock = prevDiff[index]

      if (currentBlock.type === 'unchanged') {
        // Should not happen
        return prevDiff
      }

      if (!currentBlock.originalValue) {
        return [...prevDiff.slice(0, index), ...prevDiff.slice(index + 1)]
      }

      const newBlock: DiffBlock =
        currentBlock.type === 'modified'
          ? {
              type: 'unchanged',
              value: currentBlock.originalValue,
            }
          : currentBlock

      return [
        ...prevDiff.slice(0, index),
        newBlock,
        ...prevDiff.slice(index + 1),
      ]
    })
  }

  const acceptDiffBlock = (index: number) => {
    setDiff((prevDiff) => {
      const currentBlock = prevDiff[index]

      if (currentBlock.type === 'unchanged') {
        // Should not happen
        return prevDiff
      }

      if (!currentBlock.modifiedValue) {
        return [...prevDiff.slice(0, index), ...prevDiff.slice(index + 1)]
      }

      const newBlock: DiffBlock =
        currentBlock.type === 'modified'
          ? {
              type: 'unchanged',
              value: currentBlock.modifiedValue,
            }
          : currentBlock

      return [
        ...prevDiff.slice(0, index),
        newBlock,
        ...prevDiff.slice(index + 1),
      ]
    })
  }

  return (
    <div id="smtcmp-apply-view">
      <div className="view-header">
        <div className="view-header-left">
          <div className="view-header-nav-buttons"></div>
        </div>
        <div className="view-header-title-container mod-at-start">
          <div className="view-header-title">
            Applying: {state?.file?.name ?? ''}
          </div>
          <div className="view-actions">
            <button
              className="clickable-icon view-action smtcmp-approve-button"
              aria-label="Accept changes"
              onClick={handleAccept}
            >
              {acceptIcon && <CheckIcon size={14} />}
              Accept
            </button>
            <button
              className="clickable-icon view-action smtcmp-reject-button"
              aria-label="Reject changes"
              onClick={handleReject}
            >
              {rejectIcon && <X size={14} />}
              Reject
            </button>
          </div>
        </div>
      </div>

      <div className="view-content">
        <div className="markdown-source-view cm-s-obsidian mod-cm6 node-insert-event is-readable-line-width is-live-preview is-folding show-properties">
          <div className="cm-editor">
            <div className="cm-scroller">
              <div className="cm-sizer">
                <div className="smtcmp-inline-title">
                  {state?.file?.name
                    ? state.file.name.replace(/\.[^/.]+$/, '')
                    : ''}
                </div>

                {diff.map((block, index) => (
                  <DiffBlockView
                    key={index}
                    block={block}
                    onAccept={() => acceptDiffBlock(index)}
                    onReject={() => rejectDiffBlock(index)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DiffBlockView({
  block,
  onAccept,
  onReject,
}: {
  block: DiffBlock
  onAccept: () => void
  onReject: () => void
}) {
  const acceptIcon = getIcon('check')
  const rejectIcon = getIcon('x')

  if (block.type === 'unchanged') {
    return (
      <div className={`smtcmp-diff-line`}>
        <div style={{ width: '100%' }}>{block.value}</div>
      </div>
    )
  } else if (block.type === 'modified') {
    return (
      <div className="smtcmp-diff-line-container">
        {block.originalValue && block.originalValue.length > 0 && (
          <div className={`smtcmp-diff-line removed`}>
            <div style={{ width: '100%' }}>{block.originalValue}</div>
          </div>
        )}
        {block.modifiedValue && block.modifiedValue.length > 0 && (
          <div className={`smtcmp-diff-line added`}>
            <div style={{ width: '100%' }}>{block.modifiedValue}</div>
          </div>
        )}
        <div className="smtcmp-diff-line-actions">
          <button
            aria-label="Accept block"
            onClick={onAccept}
            className="smtcmp-accept"
          >
            {acceptIcon && 'Y'}
          </button>
          <button
            aria-label="Reject block"
            onClick={onReject}
            className="smtcmp-exclude"
          >
            {rejectIcon && 'N'}
          </button>
        </div>
      </div>
    )
  }
}
