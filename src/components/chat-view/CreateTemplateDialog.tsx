import { $generateNodesFromSerializedNodes } from '@lexical/clipboard'
import { BaseSerializedNode } from '@lexical/clipboard/clipboard'
import { InitialEditorStateType } from '@lexical/react/LexicalComposer'
import * as Dialog from '@radix-ui/react-dialog'
import { $insertNodes, LexicalEditor } from 'lexical'
import { X } from 'lucide-react'
import { Notice } from 'obsidian'
import { useRef, useState } from 'react'

import { useDatabase } from '../../contexts/database-context'
import { useDialogContainer } from '../../contexts/dialog-container-context'
import { DuplicateTemplateException } from '../../database/exception'

import LexicalContentEditable from './chat-input/LexicalContentEditable'

/*
 * This component must be used inside <Dialog.Root modal={false}>
 * The modal={false} prop is required because modal mode blocks pointer events across the entire page,
 * which would conflict with lexical editor popovers
 */
export default function CreateTemplateDialogContent({
  selectedSerializedNodes,
  onClose,
}: {
  selectedSerializedNodes?: BaseSerializedNode[] | null
  onClose: () => void
}) {
  const container = useDialogContainer()
  const { getTemplateManager } = useDatabase()

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

  const onSubmit = async () => {
    try {
      if (!editorRef.current) return
      const serializedEditorState = editorRef.current.toJSON()
      const nodes = serializedEditorState.editorState.root.children
      if (nodes.length === 0) {
        new Notice('Please enter a content for your template')
        return
      }
      if (templateName.trim().length === 0) {
        new Notice('Please enter a name for your template')
        return
      }

      await (
        await getTemplateManager()
      ).createTemplate({
        name: templateName,
        content: { nodes },
      })
      new Notice(`Template created: ${templateName}`)
      setTemplateName('')
      onClose()
    } catch (error) {
      if (error instanceof DuplicateTemplateException) {
        new Notice('A template with this name already exists')
      } else {
        console.error(error)
        new Notice('Failed to create template')
      }
    }
  }

  return (
    <Dialog.Portal container={container}>
      <Dialog.Content className="smtcmp-dialog-content">
        <div className="smtcmp-dialog-header">
          <Dialog.Title className="smtcmp-dialog-title">
            Create template
          </Dialog.Title>
          <Dialog.Description className="smtcmp-dialog-description">
            Create template from selected content
          </Dialog.Description>
        </div>

        <div className="smtcmp-dialog-input">
          <label>Name</label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation()
                e.preventDefault()
                onSubmit()
              }
            }}
          />
        </div>

        <div className="smtcmp-chat-user-input-container">
          <LexicalContentEditable
            initialEditorState={initialEditorState}
            editorRef={editorRef}
            contentEditableRef={contentEditableRef}
            onEnter={onSubmit}
          />
        </div>

        <div className="smtcmp-dialog-footer">
          <button onClick={onSubmit}>Create template</button>
        </div>

        <Dialog.Close className="smtcmp-dialog-close" asChild>
          <X size={16} />
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  )
}
