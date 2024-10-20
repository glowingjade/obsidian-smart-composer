import { memo } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import {
  oneDark,
  oneLight,
} from 'react-syntax-highlighter/dist/esm/styles/prism'

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

export const MemoizedSyntaxHighlighterWrapper = memo(SyntaxHighlighterWrapper)
