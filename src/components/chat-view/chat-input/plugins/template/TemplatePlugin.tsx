import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import clsx from 'clsx'
import {
  $parseSerializedNode,
  COMMAND_PRIORITY_NORMAL,
  TextNode,
} from 'lexical'
import { Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { useDatabase } from '../../../../../contexts/database-context'
import { SelectTemplate } from '../../../../../database/schema'
import { MenuOption } from '../shared/LexicalMenu'
import {
  LexicalTypeaheadMenuPlugin,
  useBasicTypeaheadTriggerMatch,
} from '../typeahead-menu/LexicalTypeaheadMenuPlugin'

class TemplateTypeaheadOption extends MenuOption {
  name: string
  template: SelectTemplate

  constructor(name: string, template: SelectTemplate) {
    super(name)
    this.name = name
    this.template = template
  }
}

function TemplateMenuItem({
  index,
  isSelected,
  onClick,
  onDelete,
  onMouseEnter,
  option,
}: {
  index: number
  isSelected: boolean
  onClick: () => void
  onDelete: () => void
  onMouseEnter: () => void
  option: TemplateTypeaheadOption
}) {
  return (
    <li
      key={option.key}
      tabIndex={-1}
      className={clsx('item', isSelected && 'selected')}
      ref={(el) => option.setRefElement(el)}
      role="option"
      aria-selected={isSelected}
      id={`typeahead-item-${index}`}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      <div className="smtcmp-template-menu-item">
        <div className="text">{option.name}</div>
        <div
          onClick={(evt) => {
            evt.stopPropagation()
            evt.preventDefault()
            onDelete()
          }}
          className="smtcmp-template-menu-item-delete"
        >
          <Trash2 size={12} />
        </div>
      </div>
    </li>
  )
}

export default function TemplatePlugin() {
  const [editor] = useLexicalComposerContext()
  const { getTemplateManager } = useDatabase()

  const [queryString, setQueryString] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<SelectTemplate[]>([])

  useEffect(() => {
    if (queryString == null) return
    getTemplateManager().then((templateManager) =>
      templateManager.searchTemplates(queryString).then(setSearchResults),
    )
  }, [queryString, getTemplateManager])

  const options = useMemo(
    () =>
      searchResults.map(
        (result) => new TemplateTypeaheadOption(result.name, result),
      ),
    [searchResults],
  )

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch('/', {
    minLength: 0,
  })

  const onSelectOption = useCallback(
    (
      selectedOption: TemplateTypeaheadOption,
      nodeToRemove: TextNode | null,
      closeMenu: () => void,
    ) => {
      editor.update(() => {
        const parsedNodes = selectedOption.template.content.nodes.map((node) =>
          $parseSerializedNode(node),
        )
        if (nodeToRemove) {
          const parent = nodeToRemove.getParentOrThrow()
          parent.splice(nodeToRemove.getIndexWithinParent(), 1, parsedNodes)
          const lastNode = parsedNodes[parsedNodes.length - 1]
          lastNode.selectEnd()
        }
        closeMenu()
      })
    },
    [editor],
  )

  const handleDelete = useCallback(
    async (option: TemplateTypeaheadOption) => {
      await (await getTemplateManager()).deleteTemplate(option.template.id)
      if (queryString !== null) {
        const updatedResults = await (
          await getTemplateManager()
        ).searchTemplates(queryString)
        setSearchResults(updatedResults)
      }
    },
    [getTemplateManager, queryString],
  )

  return (
    <LexicalTypeaheadMenuPlugin<TemplateTypeaheadOption>
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={checkForTriggerMatch}
      options={options}
      commandPriority={COMMAND_PRIORITY_NORMAL}
      menuRenderFn={(
        anchorElementRef,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
      ) =>
        anchorElementRef.current && searchResults.length
          ? createPortal(
              <div
                className="smtcmp-popover"
                style={{
                  position: 'fixed',
                }}
              >
                <ul>
                  {options.map((option, i: number) => (
                    <TemplateMenuItem
                      index={i}
                      isSelected={selectedIndex === i}
                      onClick={() => {
                        setHighlightedIndex(i)
                        selectOptionAndCleanUp(option)
                      }}
                      onDelete={() => {
                        handleDelete(option)
                      }}
                      onMouseEnter={() => {
                        setHighlightedIndex(i)
                      }}
                      key={option.key}
                      option={option}
                    />
                  ))}
                </ul>
              </div>,
              anchorElementRef.current,
            )
          : null
      }
    />
  )
}
