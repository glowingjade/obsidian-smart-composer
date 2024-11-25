import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { DRAG_DROP_PASTE } from '@lexical/rich-text'
import { COMMAND_PRIORITY_LOW } from 'lexical'
import { useEffect } from 'react'

import { MentionableImage } from '../../../../../types/mentionable'
import { fileToMentionableImage } from '../../../../../utils/image'

export default function DragDropPaste({
  onCreateImageMentionables,
}: {
  onCreateImageMentionables?: (mentionables: MentionableImage[]) => void
}): null {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerCommand(
      DRAG_DROP_PASTE, // dispatched in RichTextPlugin
      (files) => {
        ;(async () => {
          const images = files.filter((file) => file.type.startsWith('image/'))
          const mentionableImages = await Promise.all(
            images.map(async (image) => await fileToMentionableImage(image)),
          )
          onCreateImageMentionables?.(mentionableImages)
        })()
        return true
      },
      COMMAND_PRIORITY_LOW,
    )
  }, [editor, onCreateImageMentionables])

  return null
}
