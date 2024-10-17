import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { TextNode } from 'lexical'
import { useEffect } from 'react'

export default function NoFormatPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    editor.registerNodeTransform(TextNode, (node) => {
      if (node.getFormat() !== 0) {
        node.setFormat(0)
      }
    })
  }, [editor])

  return null
}
