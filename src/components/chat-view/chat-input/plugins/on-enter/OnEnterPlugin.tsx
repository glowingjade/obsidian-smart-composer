import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { Platform } from 'obsidian'
import { COMMAND_PRIORITY_LOW, KEY_ENTER_COMMAND } from 'lexical'
import { useEffect } from 'react'

export default function OnEnterPlugin({
  onEnter,
}: {
  onEnter: (evt: KeyboardEvent, useVaultSearch?: boolean) => void
}) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    const removeListener = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (evt: KeyboardEvent) => {
        if (evt.shiftKey) {
          if (Platform.isMacOS ? evt.metaKey : evt.ctrlKey) {
            onEnter(evt, true)
            return true
          }
          return false
        }
        onEnter(evt, false)
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
