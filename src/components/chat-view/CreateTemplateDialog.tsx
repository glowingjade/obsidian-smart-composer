import { $generateNodesFromSerializedNodes } from '@lexical/clipboard'
import { BaseSerializedNode } from '@lexical/clipboard/clipboard'
import { InitialEditorStateType } from '@lexical/react/LexicalComposer'
import * as Dialog from '@radix-ui/react-dialog'
import { $insertNodes, LexicalEditor } from 'lexical'
import { X } from 'lucide-react'
import { Notice } from 'obsidian'
import { useRef, useState, useEffect } from 'react'

import { useDialogContainer } from '../../contexts/dialog-container-context'
import { DuplicateTemplateException } from '../../database/exception'
import { useTemplateManager } from '../../hooks/useJsonManagers'
import { Template } from '../../database/json/template/types'

import LexicalContentEditable from './chat-input/LexicalContentEditable'

/*
 * This component must be used inside <Dialog.Root modal={false}>
 * The modal={false} prop is required because modal mode blocks pointer events across the entire page,
 * which would conflict with lexical editor popovers
 */
export default function CreateTemplateDialogContent({
  selectedSerializedNodes,
  editingTemplate,
  onClose,
}: {
  selectedSerializedNodes?: BaseSerializedNode[] | null
  editingTemplate?: Template
  onClose: () => void
}) {
  const templateManager = useTemplateManager()
  const container = useDialogContainer()

  const [templateName, setTemplateName] = useState(editingTemplate?.name || '')
  const editorRef = useRef<LexicalEditor | null>(null)
  const contentEditableRef = useRef<HTMLDivElement>(null)

  // Update template name when editingTemplate changes
  useEffect(() => {
    setTemplateName(editingTemplate?.name || '')
  }, [editingTemplate])

  // Determine if we're in edit mode
  const isEditMode = !!editingTemplate
  const dialogTitle = isEditMode ? 'Edit template' : 'Create template'
  const dialogDescription = isEditMode ? 'Edit template' : 'Create template from selected content'
  const buttonText = isEditMode ? 'Save template' : 'Create template'

  const initialEditorState: InitialEditorStateType = (
    editor: LexicalEditor,
  ) => {
    if (editingTemplate) {
      editor.update(() => {
        const parsedNodes = $generateNodesFromSerializedNodes(
          editingTemplate.content.nodes,
        )
        $insertNodes(parsedNodes)
      })
    } else if (selectedSerializedNodes) {
      editor.update(() => {
        const parsedNodes = $generateNodesFromSerializedNodes(
          selectedSerializedNodes,
        )
        $insertNodes(parsedNodes)
      })
    }
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

      await templateManager.createOrUpdateTemplate({
        name: templateName,
        content: { nodes },
      })

      new Notice(`Template ${isEditMode ? 'updated' : 'created'}: ${templateName}`)
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
            {dialogTitle}
          </Dialog.Title>
          <Dialog.Description className="smtcmp-dialog-description">
            {dialogDescription}
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
          <button onClick={onSubmit}>{buttonText}</button>
        </div>

        <Dialog.Close className="smtcmp-dialog-close" asChild>
          <X size={16} />
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  )
}
