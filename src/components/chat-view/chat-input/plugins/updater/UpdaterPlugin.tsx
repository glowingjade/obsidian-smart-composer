import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { SerializedEditorState } from 'lexical'
import { Ref, useImperativeHandle } from 'react'

export type UpdaterPluginRef = {
  update: (content: SerializedEditorState) => void
}

export default function UpdaterPlugin({
  updaterRef,
}: {
  updaterRef: Ref<UpdaterPluginRef>
}) {
  const [editor] = useLexicalComposerContext()

  useImperativeHandle(updaterRef, () => ({
    update: (content: SerializedEditorState) => {
      editor.setEditorState(editor.parseEditorState(content))
    },
  }))

  return null
}
