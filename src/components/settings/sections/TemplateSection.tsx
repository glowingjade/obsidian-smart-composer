import { Edit, Trash2 } from 'lucide-react'
import { App, Notice } from 'obsidian'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { TemplateManager } from '../../../database/json/template/TemplateManager'
import { TemplateMetadata } from '../../../database/json/template/types'
import { ObsidianButton } from '../../common/ObsidianButton'
import { ConfirmModal } from '../../modals/ConfirmModal'
import {
  CreateTemplateModal,
  EditTemplateModal,
} from '../../modals/TemplateFormModal'

type TemplateSectionProps = {
  app: App
}

export function TemplateSection({ app }: TemplateSectionProps) {
  const templateManager = useMemo(() => new TemplateManager(app), [app])

  const [templateList, setTemplateList] = useState<TemplateMetadata[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchTemplateList = useCallback(async () => {
    setIsLoading(true)
    try {
      setTemplateList(await templateManager.listMetadata())
    } catch (error) {
      console.error('Failed to fetch template list:', error)
      new Notice(
        'Failed to load templates. Please try refreshing the settings.',
      )
      setTemplateList([])
    } finally {
      setIsLoading(false)
    }
  }, [templateManager])

  const handleCreate = useCallback(() => {
    new CreateTemplateModal({
      app,
      selectedSerializedNodes: null,
      onSubmit: fetchTemplateList,
    }).open()
  }, [fetchTemplateList, app])

  const handleEdit = useCallback(
    (template: TemplateMetadata) => {
      new EditTemplateModal({
        app,
        templateId: template.id,
        onSubmit: fetchTemplateList,
      }).open()
    },
    [fetchTemplateList, app],
  )

  const handleDelete = useCallback(
    (template: TemplateMetadata) => {
      const message = `Are you sure you want to delete template "${template.name}"?`
      new ConfirmModal(app, {
        title: 'Delete Template',
        message: message,
        ctaText: 'Delete',
        onConfirm: async () => {
          try {
            await templateManager.deleteTemplate(template.id)
            fetchTemplateList()
          } catch (error) {
            console.error('Failed to delete template:', error)
            new Notice('Failed to delete template. Please try again.')
          }
        },
      }).open()
    },
    [templateManager, fetchTemplateList, app],
  )

  useEffect(() => {
    fetchTemplateList()
  }, [fetchTemplateList])

  return (
    <div className="smtcmp-settings-section">
      <div className="smtcmp-settings-header">Prompt Templates</div>

      <div className="smtcmp-settings-desc smtcmp-settings-callout">
        <strong>How to use:</strong> Create templates with reusable content that
        you can quickly insert into your chat. Type <code>/template-name</code>{' '}
        in the chat input to trigger template insertion. You can also drag and
        select text in the chat input to reveal a &quot;Create template&quot;
        button for quick template creation.
      </div>

      <div className="smtcmp-settings-sub-header-container">
        <div className="smtcmp-settings-sub-header">Saved Templates</div>
        <ObsidianButton text="Add Prompt Template" onClick={handleCreate} />
      </div>

      <div className="smtcmp-templates-container">
        <div className="smtcmp-templates-header">
          <div>Name</div>
          <div>Actions</div>
        </div>
        {isLoading ? (
          <div className="smtcmp-templates-empty">Loading templates...</div>
        ) : templateList.length > 0 ? (
          templateList.map((template) => (
            <TemplateItem
              key={template.id}
              template={template}
              onDelete={() => {
                handleDelete(template)
              }}
              onEdit={() => {
                handleEdit(template)
              }}
            />
          ))
        ) : (
          <div className="smtcmp-templates-empty">No templates found</div>
        )}
      </div>
    </div>
  )
}

function TemplateItem({
  template,
  onEdit,
  onDelete,
}: {
  template: TemplateMetadata
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="smtcmp-template">
      <div className="smtcmp-template-row">
        <div className="smtcmp-template-name">{template.name}</div>
        <div className="smtcmp-template-actions">
          <button
            className="clickable-icon"
            aria-label="Edit Template"
            onClick={onEdit}
          >
            <Edit size={16} />
          </button>
          <button
            className="clickable-icon"
            aria-label="Delete Template"
            onClick={onDelete}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
