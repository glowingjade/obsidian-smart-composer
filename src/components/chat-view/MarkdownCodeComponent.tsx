import { Check, CopyIcon, Loader2 } from 'lucide-react'
import { PropsWithChildren, useMemo, useState } from 'react'

import { useDarkModeContext } from '../../contexts/dark-mode-context'

import { MemoizedSyntaxHighlighterWrapper } from './SyntaxHighlighterWrapper'

export default function MarkdownCodeComponent({
  onApply,
  isApplying,
  language,
  filename,
  children,
}: PropsWithChildren<{
  onApply: (blockToApply: string) => void
  isApplying: boolean
  language?: string
  filename?: string
}>) {
  const [copied, setCopied] = useState(false)
  const { isDarkMode } = useDarkModeContext()

  const wrapLines = useMemo(() => {
    return !language || ['markdown'].includes(language)
  }, [language])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(children))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <div className={`smtcmp-code-block ${filename ? 'has-filename' : ''}`}>
      <div className={'smtcmp-code-block-header'}>
        {filename && (
          <div className={'smtcmp-code-block-header-filename'}>{filename}</div>
        )}
        <div className={'smtcmp-code-block-header-button'}>
          <button
            onClick={() => {
              handleCopy()
            }}
          >
            {copied ? (
              <>
                <Check size={10} /> Copied
              </>
            ) : (
              <>
                <CopyIcon size={10} /> Copy
              </>
            )}
          </button>
          <button
            onClick={() => {
              onApply(String(children))
            }}
            disabled={isApplying}
          >
            {isApplying ? (
              <>
                <Loader2 className="spinner" size={14} /> Applying...
              </>
            ) : (
              'Apply'
            )}
          </button>
        </div>
      </div>
      <MemoizedSyntaxHighlighterWrapper
        isDarkMode={isDarkMode}
        language={language}
        hasFilename={!!filename}
        wrapLines={wrapLines}
      >
        {String(children)}
      </MemoizedSyntaxHighlighterWrapper>
    </div>
  )
}
