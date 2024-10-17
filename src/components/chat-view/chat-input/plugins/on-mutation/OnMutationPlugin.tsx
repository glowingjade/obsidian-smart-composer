import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { Klass, LexicalNode, NodeKey, NodeMutation } from 'lexical'
import { useEffect } from 'react'

export type NodeMutations<T> = Map<NodeKey, { mutation: NodeMutation; node: T }>

export default function OnMutationPlugin<T extends LexicalNode>({
  nodeClass,
  onMutation,
}: {
  nodeClass: Klass<T>
  onMutation: (mutations: NodeMutations<T>) => void
}) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    const removeListener = editor.registerMutationListener(
      nodeClass,
      (mutatedNodes, payload) => {
        const editorState = editor.getEditorState()

        const mutations = new Map<
          NodeKey,
          { mutation: NodeMutation; node: T }
        >()
        for (const [key, mutation] of mutatedNodes) {
          mutations.set(key, {
            mutation,
            node:
              mutation === 'destroyed'
                ? (payload.prevEditorState._nodeMap.get(key) as T)
                : (editorState._nodeMap.get(key) as T),
          })
        }

        onMutation(mutations)
      },
    )

    return () => {
      removeListener()
    }
  }, [editor, nodeClass, onMutation])

  return null
}
