import { $generateNodesFromSerializedNodes } from '@lexical/clipboard'
import { BaseSerializedNode } from '@lexical/clipboard/clipboard'
import { InitialEditorStateType } from '@lexical/react/LexicalComposer'
import * as Dialog from '@radix-ui/react-dialog'
import { $insertNodes, $parseSerializedNode, LexicalEditor } from 'lexical'
import { X } from 'lucide-react'
import { useRef, useState } from 'react'

import { useDialogContainer } from '../../contexts/dialog-container-context'

import LexicalContentEditable from './chat-input/LexicalContentEditable'

/*
 * This component must be used inside <Dialog.Root modal={false}>
 * The modal={false} prop is required because modal mode blocks pointer events across the entire page,
 * which would conflict with lexical editor popovers
 */
export default function CreateTemplateDialogContent({
  selectedSerializedNodes,
}: {
  selectedSerializedNodes?: BaseSerializedNode[] | null
}) {
  const container = useDialogContainer()

  const [templateName, setTemplateName] = useState('')
  const editorRef = useRef<LexicalEditor | null>(null)
  const contentEditableRef = useRef<HTMLDivElement>(null)

  const initialEditorState: InitialEditorStateType = (
    editor: LexicalEditor,
  ) => {
    if (!selectedSerializedNodes) return
    editor.update(() => {
      const parsedNodes = $generateNodesFromSerializedNodes(
        selectedSerializedNodes,
      )
      $insertNodes(parsedNodes)
    })
  }

  const onSubmit = () => {
    if (!editorRef.current) return
    const serializedEditorState = editorRef.current.toJSON()
    const nodes = serializedEditorState.editorState.root.children
    // Testing inserting nodes
    editorRef.current.update(() => {
      const parsedNodes = nodes.map((node) => $parseSerializedNode(node))
      $insertNodes(parsedNodes)
    })
  }

  return (
    <Dialog.Portal container={container}>
      <Dialog.Content
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          zIndex: 50,
          display: 'grid',
          width: '100%',
          maxWidth: '32rem',
          transform: 'translate(-50%, -50%)',
          gap: 'var(--size-4-4)',
          border: 'var(--border-width) solid var(--background-modifier-border)',
          backgroundColor: 'var(--background-secondary)',
          padding: 'var(--size-4-6)',
          transitionDuration: '200ms',
          borderRadius: 'var(--radius-m)',
        }}
      >
        <Dialog.Title
          style={{
            fontSize: 'var(--font-ui-larger)',
            fontWeight: 'var(--font-semibold)',
            lineHeight: 'var(--line-height-tight)',
            margin: 0,
          }}
        >
          Create Template
        </Dialog.Title>
        <Dialog.Description
          style={{
            fontSize: 'var(--font-ui-small)',
            color: 'var(--text-muted)',
            margin: 0,
          }}
        >
          Create a new template from the selected nodes
        </Dialog.Description>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--size-4-4)',
          }}
        >
          <div>Name</div>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            style={{
              flex: 1,
            }}
          />
        </div>

        <div className="smtcmp-chat-user-input-container">
          <LexicalContentEditable
            initialEditorState={initialEditorState}
            editorRef={editorRef}
            contentEditableRef={contentEditableRef}
            onSubmit={onSubmit}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onSubmit}>Create Template</button>
        </div>

        <Dialog.Close
          style={{
            position: 'absolute',
            right: 'var(--size-4-4)',
            top: 'var(--size-4-4)',
            cursor: 'var(--cursor)',
            opacity: 0.7,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.7'
          }}
          asChild
        >
          <X size={16} />
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  )
}
