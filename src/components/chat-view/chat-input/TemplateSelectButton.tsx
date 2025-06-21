import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  $getSelection,
  $isRangeSelection,
  $parseSerializedNode,
  LexicalEditor,
} from 'lexical'
import { ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { RefObject, useCallback, useEffect, useState } from 'react'

import { Template } from '../../../database/json/template/types'
import { useTemplateManager } from '../../../hooks/useJsonManagers'

type TemplateSelectButtonProps = {
  editorRef: RefObject<LexicalEditor | null>
}

export function TemplateSelectButton({ editorRef }: TemplateSelectButtonProps) {
  const templateManager = useTemplateManager()
  const [isOpen, setIsOpen] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])

  // Load all templates when component mounts or dropdown opens
  useEffect(() => {
    if (isOpen) {
      templateManager.searchTemplates('').then(setTemplates)
    }
  }, [isOpen, templateManager])

  const handleTemplateSelect = useCallback(
    (template: Template) => {
      const editor = editorRef.current
      if (!editor) return

      editor.update(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          // Parse the template content and insert it
          const nodes = template.content.nodes.map((serializedNode) =>
            $parseSerializedNode(serializedNode),
          )

          // Insert each node
          nodes.forEach((node) => {
            selection.insertNodes([node])
          })
        }
      })
      setIsOpen(false)
    },
    [editorRef],
  )

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger className="smtcmp-chat-input-template-select">
        <div className="smtcmp-chat-input-template-select__icon">
          <FileText size={12} />
        </div>
        <div className="smtcmp-chat-input-template-select__text">Templates</div>
        <div className="smtcmp-chat-input-template-select__chevron">
          {isOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </div>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className="smtcmp-popover">
          <ul>
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
              templates.map((template) => (
                <DropdownMenu.Item
                  key={template.id}
                  onSelect={() => handleTemplateSelect(template)}
                  asChild
                >
                  <li>{template.name}</li>
                </DropdownMenu.Item>
              ))
            )}
          </ul>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
