import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { COMMAND_PRIORITY_LOW, PASTE_COMMAND, PasteCommandType } from 'lexical'
import { useEffect } from 'react'

import { MentionableImage } from '../../../../../types/mentionable'

export default function ImagePastePlugin({
  onCreateImageMentionable,
}: {
  onCreateImageMentionable?: (mentionable: MentionableImage) => void
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

      images.forEach((image) => {
        const reader = new FileReader()
        reader.onload = () => {
          const base64Data = reader.result as string
          const mentionable: MentionableImage = {
            type: 'image',
            name: image.name,
            mimeType: image.type,
            data: base64Data,
          }
          onCreateImageMentionable?.(mentionable)
        }
        reader.readAsDataURL(image)
      })

      return true
    }

    return editor.registerCommand(
      PASTE_COMMAND,
      handlePaste,
      COMMAND_PRIORITY_LOW,
    )
  }, [editor, onCreateImageMentionable])

  return null
}
