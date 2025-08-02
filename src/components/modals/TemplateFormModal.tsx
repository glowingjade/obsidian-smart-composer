import { $generateNodesFromSerializedNodes } from '@lexical/clipboard'
import { BaseSerializedNode } from '@lexical/clipboard/clipboard'
import { InitialEditorStateType } from '@lexical/react/LexicalComposer'
import { $insertNodes, LexicalEditor } from 'lexical'
import { App, Notice } from 'obsidian'
import { useEffect, useMemo, useRef, useState } from 'react'

import { AppProvider } from '../../contexts/app-context'
import { DuplicateTemplateException } from '../../database/json/exception'
import { TemplateManager } from '../../database/json/template/TemplateManager'
import LexicalContentEditable from '../chat-view/chat-input/LexicalContentEditable'
import { ObsidianButton } from '../common/ObsidianButton'
import { ObsidianSetting } from '../common/ObsidianSetting'
import { ObsidianTextInput } from '../common/ObsidianTextInput'
import { ReactModal } from '../common/ReactModal'

type TemplateFormComponentProps = {
  app: App
  selectedSerializedNodes?: BaseSerializedNode[] | null
  templateId?: string
  onSubmit?: () => void
  onClose: () => void
}

export class CreateTemplateModal extends ReactModal<TemplateFormComponentProps> {
  constructor({
    app,
    selectedSerializedNodes,
    onSubmit,
  }: {
    app: App
    selectedSerializedNodes?: BaseSerializedNode[] | null
    onSubmit?: () => void
  }) {
    super({
      app: app,
      Component: TemplateFormComponentWrapper,
      props: {
        app,
        selectedSerializedNodes,
        onSubmit,
      },
      options: {
        title: 'Add Template',
      },
    })
  }
}

export class EditTemplateModal extends ReactModal<TemplateFormComponentProps> {
  constructor({
    app,
    templateId,
    onSubmit,
  }: {
    app: App
    templateId?: string
    onSubmit?: () => void
  }) {
    super({
      app: app,
      Component: TemplateFormComponentWrapper,
      props: {
        app,
        templateId,
        onSubmit,
      },
      options: {
        title: 'Edit Template',
      },
    })
  }
}

function TemplateFormComponentWrapper({
  app,
  selectedSerializedNodes,
  templateId,
  onSubmit,
  onClose,
}: TemplateFormComponentProps) {
  return (
    <AppProvider app={app}>
      <TemplateFormComponent
        app={app}
        selectedSerializedNodes={selectedSerializedNodes}
        templateId={templateId}
        onSubmit={onSubmit}
        onClose={onClose}
      />
    </AppProvider>
  )
}

function TemplateFormComponent({
  app,
  selectedSerializedNodes,
  templateId,
  onSubmit,
  onClose,
}: TemplateFormComponentProps) {
  const templateManager = useMemo(() => new TemplateManager(app), [app])

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

  const handleSubmit = async () => {
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

      if (templateId === undefined) {
        await templateManager.createTemplate({
          name: templateName,
          content: { nodes },
        })
      } else {
        await templateManager.updateTemplate(templateId, {
          name: templateName,
          content: { nodes },
        })
      }

      new Notice(
        `Template ${templateId === undefined ? 'created' : 'updated'}: ${templateName}`,
      )

      onSubmit?.()
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

  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true

    async function fetchExistingTemplate(templateId: string) {
      const existingTemplate = await templateManager.findById(templateId)
      if (existingTemplate && isMountedRef.current) {
        setTemplateName(existingTemplate.name)
        editorRef.current?.update(() => {
          const parsedNodes = $generateNodesFromSerializedNodes(
            existingTemplate.content.nodes,
          )
          $insertNodes(parsedNodes)
        })
      }
    }
    if (templateId) {
      fetchExistingTemplate(templateId)
    }

    return () => {
      isMountedRef.current = false
    }
  }, [templateId, templateManager])

  return (
    <>
      <ObsidianSetting name="Name" desc="The name of the template" required>
        <ObsidianTextInput
          value={templateName}
          onChange={(value) => setTemplateName(value)}
        />
      </ObsidianSetting>

      <ObsidianSetting
        name="Template Content"
        desc="Content of the template"
        className="smtcmp-settings-description-preserve-whitespace"
        required
      />
      <div className="smtcmp-chat-user-input-container">
        <LexicalContentEditable
          initialEditorState={initialEditorState}
          editorRef={editorRef}
          contentEditableRef={contentEditableRef}
          onEnter={handleSubmit}
        />
      </div>

      <ObsidianSetting>
        <ObsidianButton text="Save" onClick={handleSubmit} cta />
        <ObsidianButton text="Cancel" onClick={onClose} />
      </ObsidianSetting>
    </>
  )
}
