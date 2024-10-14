import { Check, CopyIcon, Loader2 } from 'lucide-react'
import { PropsWithChildren, memo, useMemo, useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import {
  oneDark,
  oneLight,
} from 'react-syntax-highlighter/dist/esm/styles/prism'

import { useDarkModeContext } from '../../contexts/dark-mode-context'

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

function SyntaxHighlighterWrapper({
  isDarkMode,
  language,
  hasFilename,
  wrapLines,
  children,
}: {
  isDarkMode: boolean
  language: string | undefined
  hasFilename: boolean
  wrapLines: boolean
  children: string
}) {
  return (
    <SyntaxHighlighter
      language={language}
      style={isDarkMode ? oneDark : oneLight}
      customStyle={{
        borderRadius: hasFilename
          ? '0 0 var(--radius-s) var(--radius-s)'
          : 'var(--radius-s)',
        margin: 0,
        padding: 'var(--size-4-2)',
        fontSize: 'var(--font-ui-small)',
        fontFamily:
          language === 'markdown' ? 'var(--font-interface)' : 'inherit',
      }}
      wrapLines={wrapLines}
      lineProps={
        // Wrapping should work without lineProps, but Obsidian's default CSS seems to override SyntaxHighlighter's styles.
        // We manually override the white-space property to ensure proper wrapping.
        wrapLines
          ? {
              style: { whiteSpace: 'pre-wrap' },
            }
          : undefined
      }
    >
      {children}
    </SyntaxHighlighter>
  )
}

const MemoizedSyntaxHighlighterWrapper = memo(SyntaxHighlighterWrapper)
