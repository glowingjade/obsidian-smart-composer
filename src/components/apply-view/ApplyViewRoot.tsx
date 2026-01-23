import { CheckIcon, ChevronDown, ChevronUp, X } from 'lucide-react'
import { getIcon } from 'obsidian'
import {
  forwardRef,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { ApplyViewState } from '../../ApplyView'
import { useApp } from '../../contexts/app-context'
import {
  DiffBlock,
  InlineToken,
  createDiffBlocks,
} from '../../utils/chat/diff'

export default function ApplyViewRoot({
  state,
  close,
}: {
  state: ApplyViewState
  close: () => void
}) {
  const acceptIcon = getIcon('check')
  const rejectIcon = getIcon('x')
  const [currentDiffIndex, setCurrentDiffIndex] = useState(0)
  const diffBlockRefs = useRef<(HTMLDivElement | null)[]>([])
  const scrollerRef = useRef<HTMLDivElement>(null)

  const app = useApp()

  const [diff, setDiff] = useState<DiffBlock[]>(
    createDiffBlocks(state.originalContent, state.newContent),
  )
  const modifiedBlockIndices = useMemo(
    () =>
      diff.reduce<number[]>((acc, block, index) => {
        if (block.type !== 'unchanged') {
          acc.push(index)
        }
        return acc
      }, []),
    [diff],
  )

  const scrollToDiffBlock = useCallback(
    (index: number) => {
      if (index >= 0 && index < modifiedBlockIndices.length) {
        const element = diffBlockRefs.current[modifiedBlockIndices[index]]
        if (element) {
          element.scrollIntoView({ block: 'start' })
          setCurrentDiffIndex(index)
        }
      }
    },
    [modifiedBlockIndices],
  )

  const handlePrevDiff = useCallback(() => {
    scrollToDiffBlock(currentDiffIndex - 1)
  }, [currentDiffIndex, scrollToDiffBlock])

  const handleNextDiff = useCallback(() => {
    scrollToDiffBlock(currentDiffIndex + 1)
  }, [currentDiffIndex, scrollToDiffBlock])

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

  const acceptCurrentBlock = (index: number) => {
    setDiff((prevDiff) => {
      const currentPart = prevDiff[index]

      if (currentPart.type === 'unchanged') {
        // Should not happen
        return prevDiff
      }

      if (!currentPart.originalValue) {
        return [...prevDiff.slice(0, index), ...prevDiff.slice(index + 1)]
      }

      const newPart: DiffBlock =
        currentPart.type === 'modified'
          ? {
              type: 'unchanged',
              value: currentPart.originalValue,
            }
          : currentPart

      return [
        ...prevDiff.slice(0, index),
        newPart,
        ...prevDiff.slice(index + 1),
      ]
    })
  }

  const acceptIncomingBlock = (index: number) => {
    setDiff((prevDiff) => {
      const currentPart = prevDiff[index]

      if (currentPart.type === 'unchanged') {
        // Should not happen
        return prevDiff
      }

      if (!currentPart.modifiedValue) {
        return [...prevDiff.slice(0, index), ...prevDiff.slice(index + 1)]
      }

      const newPart: DiffBlock =
        currentPart.type === 'modified'
          ? {
              type: 'unchanged',
              value: currentPart.modifiedValue,
            }
          : currentPart

      return [
        ...prevDiff.slice(0, index),
        newPart,
        ...prevDiff.slice(index + 1),
      ]
    })
  }

  const acceptBothBlocks = (index: number) => {
    setDiff((prevDiff) => {
      const currentPart = prevDiff[index]

      if (currentPart.type === 'unchanged') {
        // Should not happen
        return prevDiff
      }

      const newPart: DiffBlock = {
        type: 'unchanged',
        value: [currentPart.originalValue, currentPart.modifiedValue]
          .filter(Boolean)
          .join('\n'),
      }

      return [
        ...prevDiff.slice(0, index),
        newPart,
        ...prevDiff.slice(index + 1),
      ]
    })
  }

  const updateCurrentDiffFromScroll = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const scrollerRect = scroller.getBoundingClientRect()
    const scrollerTop = scrollerRect.top
    const visibleThreshold = 10 // pixels from top to consider element "visible"

    // Find the first visible diff block
    for (let i = 0; i < modifiedBlockIndices.length; i++) {
      const element = diffBlockRefs.current[modifiedBlockIndices[i]]
      if (!element) continue

      const rect = element.getBoundingClientRect()
      const relativeTop = rect.top - scrollerTop

      // If element is visible (slightly below the top of the viewport)
      if (relativeTop >= -visibleThreshold) {
        setCurrentDiffIndex(i)
        break
      }
    }
  }, [modifiedBlockIndices])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const handleScroll = () => {
      updateCurrentDiffFromScroll()
    }

    scroller.addEventListener('scroll', handleScroll)
    return () => scroller.removeEventListener('scroll', handleScroll)
  }, [updateCurrentDiffFromScroll])

  useEffect(() => {
    if (modifiedBlockIndices.length > 0) {
      scrollToDiffBlock(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div id="smtcmp-apply-view">
      <div className="view-header">
        <div className="view-header-title-container mod-at-start">
          <div className="view-header-title">
            Applying: {state?.file?.name ?? ''}
          </div>
          <div className="view-actions">
            <div className="smtcmp-diff-navigation">
              <button
                className="clickable-icon"
                onClick={handlePrevDiff}
                disabled={currentDiffIndex <= 0}
                aria-label="Previous diff"
              >
                <ChevronUp size={14} />
              </button>
              <span>
                {modifiedBlockIndices.length > 0
                  ? `${currentDiffIndex + 1} of ${modifiedBlockIndices.length}`
                  : '0 of 0'}
              </span>
              <button
                className="clickable-icon"
                onClick={handleNextDiff}
                disabled={currentDiffIndex >= modifiedBlockIndices.length - 1}
                aria-label="Next diff"
              >
                <ChevronDown size={14} />
              </button>
            </div>
            <button
              className="clickable-icon view-action"
              aria-label="Accept changes"
              onClick={handleAccept}
            >
              {acceptIcon && <CheckIcon size={14} />}
              Accept
            </button>
            <button
              className="clickable-icon view-action"
              aria-label="Cancel apply"
              onClick={handleReject}
            >
              {rejectIcon && <X size={14} />}
              Cancel
            </button>
          </div>
        </div>
      </div>

      <div className="view-content">
        <div className="markdown-source-view cm-s-obsidian mod-cm6 node-insert-event is-readable-line-width is-live-preview is-folding show-properties">
          <div className="cm-editor">
            <div className="cm-scroller" ref={scrollerRef}>
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
                    onAcceptIncoming={() => acceptIncomingBlock(index)}
                    onAcceptCurrent={() => acceptCurrentBlock(index)}
                    onAcceptBoth={() => acceptBothBlocks(index)}
                    ref={(el) => {
                      diffBlockRefs.current[index] = el
                    }}
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

const DiffBlockView = forwardRef<
  HTMLDivElement,
  {
    block: DiffBlock
    onAcceptIncoming: () => void
    onAcceptCurrent: () => void
    onAcceptBoth: () => void
  }
>(({ block: part, onAcceptIncoming, onAcceptCurrent, onAcceptBoth }, ref) => {
  const renderInlineTokens = (
    tokens?: InlineToken[],
    fallback?: string,
  ): ReactNode => {
    if (!tokens || tokens.length === 0 || !fallback) {
      return fallback ?? null
    }

    return tokens.map((token, index) => {
      if (!token.text) return null
      const className =
        token.kind === 'added'
          ? 'smtcmp-diff-inline-added'
          : token.kind === 'removed'
            ? 'smtcmp-diff-inline-removed'
            : undefined
      return (
        <span key={`${token.kind}-${index}`} className={className}>
          {token.text}
        </span>
      )
    })
  }

  if (part.type === 'unchanged') {
    return (
      <div className="smtcmp-diff-block">
        <div style={{ width: '100%' }}>{part.value}</div>
      </div>
    )
  } else if (part.type === 'modified') {
    const renderSide = (
      value: string | undefined,
      tokens: InlineToken[] | undefined,
      sideClass: string,
    ) => {
      if (!value || value.length === 0) {
        return <div className={`smtcmp-diff-block ${sideClass} smtcmp-diff-empty`} />
      }
      return (
        <div className={`smtcmp-diff-block ${sideClass}`}>
          <div style={{ width: '100%' }}>
            {renderInlineTokens(tokens, value)}
          </div>
        </div>
      )
    }

    return (
      <div className="smtcmp-diff-block-container" ref={ref}>
        <div className="smtcmp-diff-block-grid">
          {renderSide(part.originalValue, part.originalTokens, 'removed')}
          {renderSide(part.modifiedValue, part.modifiedTokens, 'added')}
        </div>
        <div className="smtcmp-diff-block-actions">
          <button onClick={onAcceptIncoming} className="smtcmp-accept">
            Accept Incoming
          </button>
          <button onClick={onAcceptCurrent} className="smtcmp-exclude">
            Accept Current
          </button>
          <button onClick={onAcceptBoth}>Accept Both</button>
        </div>
      </div>
    )
  }
})

DiffBlockView.displayName = 'DiffBlockView'
