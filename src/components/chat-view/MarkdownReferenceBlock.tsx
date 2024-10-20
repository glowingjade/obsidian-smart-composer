import { MarkdownView } from 'obsidian'
import { PropsWithChildren, useEffect, useMemo, useState } from 'react'

import { useApp } from '../../contexts/app-context'
import { useDarkModeContext } from '../../contexts/dark-mode-context'
import { readTFileContent } from '../../utils/obsidian'

import { MemoizedSyntaxHighlighterWrapper } from './SyntaxHighlighterWrapper'

export default function MarkdownReferenceBlock({
  filename,
  startLine,
  endLine,
  language,
}: PropsWithChildren<{
  filename: string
  startLine: number
  endLine: number
  language?: string
}>) {
  const app = useApp()
  const { isDarkMode } = useDarkModeContext()
  const [blockContent, setBlockContent] = useState<string | null>(null)

  const wrapLines = useMemo(() => {
    return !language || ['markdown'].includes(language)
  }, [language])

  useEffect(() => {
    async function fetchBlockContent() {
      const file = app.vault.getFileByPath(filename)
      if (!file) {
        setBlockContent(null)
        return
      }
      const fileContent = await readTFileContent(file, app.vault)
      const content = fileContent
        .split('\n')
        .slice(startLine - 1, endLine)
        .join('\n')
      setBlockContent(content)
    }

    fetchBlockContent()
  }, [filename, startLine, endLine, app.vault])

  const handleClick = () => {
    const file = app.vault.getFileByPath(filename)
    if (!file) return

    const existingLeaf = app.workspace
      .getLeavesOfType('markdown')
      .find(
        (leaf) => leaf.view instanceof MarkdownView && leaf.view.file === file,
      )

    if (existingLeaf) {
      app.workspace.setActiveLeaf(existingLeaf, { focus: true })
      const view = existingLeaf.view as MarkdownView
      view.setEphemeralState({ line: startLine })
    } else {
      const leaf = app.workspace.getLeaf('tab')
      leaf.openFile(file, {
        eState: { line: startLine },
      })
    }
  }

  // TODO: Update styles
  return (
    blockContent && (
      <div
        className={`smtcmp-code-block ${filename ? 'has-filename' : ''}`}
        onClick={handleClick}
      >
        <div className={'smtcmp-code-block-header'}>
          {filename && (
            <div className={'smtcmp-code-block-header-filename'}>
              {filename}
            </div>
          )}
        </div>
        <MemoizedSyntaxHighlighterWrapper
          isDarkMode={isDarkMode}
          language={language}
          hasFilename={!!filename}
          wrapLines={wrapLines}
        >
          {blockContent}
        </MemoizedSyntaxHighlighterWrapper>
      </div>
    )
  )
}
