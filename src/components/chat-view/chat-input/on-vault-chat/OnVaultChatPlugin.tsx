import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { COMMAND_PRIORITY_LOW, KEY_ENTER_COMMAND } from 'lexical'
import { Platform } from 'obsidian'
import { useEffect } from 'react'

export default function OnVaultChatCommandPlugin({
  onVaultChat,
}: {
  onVaultChat: () => void
}) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    const removeListener = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (evt: KeyboardEvent) => {
        if (evt.shiftKey && (Platform.isMacOS ? evt.metaKey : evt.ctrlKey)) {
          evt.preventDefault()
          evt.stopPropagation()
          onVaultChat()
          return true
        }
        return false
      },
      COMMAND_PRIORITY_LOW,
    )

    return () => {
      removeListener()
    }
  }, [editor, onVaultChat])

  return null
}
