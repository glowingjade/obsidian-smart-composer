import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import clsx from 'clsx'
import {
  $parseSerializedNode,
  COMMAND_PRIORITY_NORMAL,
  TextNode,
} from 'lexical'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { Template } from '../../../../../database/json/template/types'
import { useTemplateManager } from '../../../../../hooks/useJsonManagers'
import { MenuOption } from '../shared/LexicalMenu'
import {
  LexicalTypeaheadMenuPlugin,
  useBasicTypeaheadTriggerMatch,
} from '../typeahead-menu/LexicalTypeaheadMenuPlugin'

class TemplateTypeaheadOption extends MenuOption {
  name: string
  template: Template

  constructor(name: string, template: Template) {
    super(name)
    this.name = name
    this.template = template
  }
}

function TemplateMenuItem({
  index,
  isSelected,
  onClick,
  onMouseEnter,
  option,
}: {
  index: number
  isSelected: boolean
  onClick: () => void
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
      </div>
    </li>
  )
}

export default function TemplatePlugin() {
  const [editor] = useLexicalComposerContext()
  const templateManager = useTemplateManager()

  const [queryString, setQueryString] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<Template[]>([])

  useEffect(() => {
    if (queryString == null) return
    templateManager.searchTemplates(queryString).then(setSearchResults)
  }, [queryString, templateManager])

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
