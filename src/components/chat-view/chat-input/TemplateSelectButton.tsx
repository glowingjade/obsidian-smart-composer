import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, ChevronUp, FileText, Trash2, Edit } from 'lucide-react'
import { useCallback, useEffect, useState, useMemo } from 'react'

import { Template } from '../../../database/json/template/types'
import { useTemplateManager } from '../../../hooks/useJsonManagers'
import { useSettings } from '../../../contexts/settings-context'
import { SerializedLexicalNode } from 'lexical'

// Helper function to convert template content to plain text
function templateContentToPlainText(content: { nodes: SerializedLexicalNode[] }): string {
  return content.nodes.map(lexicalNodeToPlainText).join('')
}

function lexicalNodeToPlainText(node: SerializedLexicalNode): string {
  if ('children' in node) {
    // Process children recursively and join their results
    return (node.children as SerializedLexicalNode[])
      .map(lexicalNodeToPlainText)
      .join('')
  } else if (node.type === 'linebreak') {
    return '\n'
  } else if ('text' in node && typeof node.text === 'string') {
    return node.text
  }
  return ''
}

export function TemplateSelectButton({
  onOpenEditDialog
}: {
  onOpenEditDialog: (template: Template) => void
}) {
  const templateManager = useTemplateManager()
  const { settings, setSettings } = useSettings()
  const [isOpen, setIsOpen] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])

  // Load all templates when component mounts
  useEffect(() => {
    templateManager.searchTemplates('').then(setTemplates)
  }, [templateManager])

  // Refresh templates when dropdown opens (to get latest changes)
  useEffect(() => {
    if (isOpen) {
      templateManager.searchTemplates('').then(setTemplates)
    }
  }, [isOpen, templateManager])

  // Find current template based on system prompt
  const currentTemplate = useMemo(() => {
    if (!settings.systemPrompt.trim()) return null

    return templates.find(template => {
      const templateText = templateContentToPlainText(template.content).trim()
      return templateText === settings.systemPrompt.trim()
    })
  }, [templates, settings.systemPrompt])

  const handleTemplateSelect = useCallback(
    async (template: Template) => {
      const templateText = templateContentToPlainText(template.content).trim()

      await setSettings({
        ...settings,
        systemPrompt: templateText,
      })

      setIsOpen(false)
    },
    [settings, setSettings],
  )

  // Clear system prompt (set to empty)
  const handleClearSystemPrompt = useCallback(
    async () => {
      await setSettings({
        ...settings,
        systemPrompt: '',
      })

      setIsOpen(false)
    },
    [settings, setSettings],
  )

  // Delete template
  const handleDeleteTemplate = useCallback(
    async (template: Template) => {
      await templateManager.deleteTemplate(template.id)
      // Refresh templates list
      const updatedTemplates = await templateManager.searchTemplates('')
      setTemplates(updatedTemplates)

      // If the deleted template was currently selected, clear the system prompt
      if (currentTemplate?.id === template.id) {
        await setSettings({
          ...settings,
          systemPrompt: '',
        })
      }
    },
    [templateManager, currentTemplate, settings, setSettings],
  )

  // Edit template
  const handleEditTemplate = useCallback(
    (template: Template) => {
      setIsOpen(false)
      // Use setTimeout to ensure dropdown closes before opening dialog
      setTimeout(() => {
        onOpenEditDialog(template)
      }, 100)
    },
    [onOpenEditDialog],
  )

  // Display current template name or "Custom" if no match
  const displayText = currentTemplate ? currentTemplate.name : (settings.systemPrompt.trim() ? 'Custom' : 'System Prompt')

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenu.Trigger className="smtcmp-chat-input-template-select">
          <div className="smtcmp-chat-input-template-select__icon">
            <FileText size={12} />
          </div>
          <div className="smtcmp-chat-input-template-select__text">{displayText}</div>
          <div className="smtcmp-chat-input-template-select__chevron">
            {isOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </div>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content className="smtcmp-popover">
            <ul>
              {/* Clear system prompt option */}
              <DropdownMenu.Item
                onSelect={handleClearSystemPrompt}
                asChild
              >
                <li style={{
                  fontStyle: 'italic',
                  color: settings.systemPrompt.trim() ? 'var(--text-normal)' : 'var(--text-muted)'
                }}>
                  {settings.systemPrompt.trim() ? '✓ ' : ''}None
                </li>
              </DropdownMenu.Item>

              {templates.length === 0 ? (
                <li
                  style={{
                    padding: '8px 12px',
                    color: 'var(--text-muted)',
                    fontSize: 'var(--font-ui-small)',
                  }}
                >
                  No templates found
                </li>
              ) : (
                templates.map((template) => {
                  const isSelected = currentTemplate?.id === template.id
                  return (
                    <DropdownMenu.Item
                      key={template.id}
                      onSelect={(event) => {
                        // Only handle template selection if the click target is not a button
                        const target = event.target as HTMLElement
                        if (!target.closest('.smtcmp-template-menu-item-delete')) {
                          handleTemplateSelect(template)
                        }
                      }}
                      asChild
                    >
                      <li style={{
                        color: isSelected ? 'var(--text-accent)' : 'var(--text-normal)'
                      }}>
                        <div className="smtcmp-template-menu-item">
                          <div
                            className="text"
                            onClick={() => handleTemplateSelect(template)}
                          >
                            {isSelected ? '✓ ' : ''}{template.name}
                          </div>
                          <div style={{ display: 'flex', gap: 'var(--size-4-1)' }}>
                            <div
                              className="smtcmp-template-menu-item-delete"
                              onClick={(evt) => {
                                evt.stopPropagation()
                                evt.preventDefault()
                                handleEditTemplate(template)
                              }}
                            >
                              <Edit size={12} />
                            </div>
                            <div
                              className="smtcmp-template-menu-item-delete"
                              onClick={(evt) => {
                                evt.stopPropagation()
                                evt.preventDefault()
                                handleDeleteTemplate(template)
                              }}
                            >
                              <Trash2 size={12} />
                            </div>
                          </div>
                        </div>
                      </li>
                    </DropdownMenu.Item>
                  )
                })
              )}
            </ul>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
  )
}
