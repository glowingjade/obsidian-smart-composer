import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useEffect } from 'react'

export type AutoFocusPluginProps = {
  defaultSelection?: 'rootStart' | 'rootEnd'
}

export default function AutoFocusPlugin({
  defaultSelection,
}: AutoFocusPluginProps) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    editor.focus(
      () => {
        const rootElement = editor.getRootElement()
        if (rootElement) {
          // requestAnimationFrame ensures DOM is rendered
          requestAnimationFrame(() => {
            rootElement.focus()
          })
        }
      },
      { defaultSelection },
    )
  }, [defaultSelection, editor])

  return null
}
