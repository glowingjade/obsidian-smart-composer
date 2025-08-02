import { Edit, Trash2 } from 'lucide-react'
import { App } from 'obsidian'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { TemplateManager } from '../../../database/json/template/TemplateManager'
import { TemplateMetadata } from '../../../database/json/template/types'
import { ObsidianButton } from '../../common/ObsidianButton'
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

  const fetchTemplateList = useCallback(async () => {
    setTemplateList(await templateManager.listMetadata())
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
    async (template: TemplateMetadata) => {
      await templateManager.deleteTemplate(template.id)
      fetchTemplateList()
    },
    [templateManager, fetchTemplateList],
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
        {templateList.length > 0 ? (
          templateList.map((template) => (
            <TemplateItem
              key={template.name}
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
