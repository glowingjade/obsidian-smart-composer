import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { COMMAND_PRIORITY_LOW, KEY_ENTER_COMMAND } from 'lexical'
import { useEffect } from 'react'

export default function OnEnterPlugin({ onEnter }: { onEnter: () => void }) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    const removeListener = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (evt: KeyboardEvent) => {
        if (evt.shiftKey) {
          return false
        }
        onEnter()
        return true
      },
      COMMAND_PRIORITY_LOW,
    )

    return () => {
      removeListener()
    }
  }, [editor, onEnter])

  return null
}
