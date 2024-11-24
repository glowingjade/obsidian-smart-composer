import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { COMMAND_PRIORITY_LOW, PASTE_COMMAND, PasteCommandType } from 'lexical'
import { useEffect } from 'react'

import { MentionableImage } from '../../../../../types/mentionable'
import { fileToMentionableImage } from '../../../../../utils/image'

export default function ImagePastePlugin({
  onCreateImageMentionables,
}: {
  onCreateImageMentionables?: (mentionables: MentionableImage[]) => void
}) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    const handlePaste = (event: PasteCommandType) => {
      const clipboardData =
        event instanceof ClipboardEvent ? event.clipboardData : null
      if (!clipboardData) return false

      const images = Array.from(clipboardData.files).filter((file) =>
        file.type.startsWith('image/'),
      )
      if (images.length === 0) return false

      Promise.all(images.map((image) => fileToMentionableImage(image))).then(
        (mentionableImages) => {
          onCreateImageMentionables?.(mentionableImages)
        },
      )
      return true
    }

    return editor.registerCommand(
      PASTE_COMMAND,
      handlePaste,
      COMMAND_PRIORITY_LOW,
    )
  }, [editor, onCreateImageMentionables])

  return null
}
