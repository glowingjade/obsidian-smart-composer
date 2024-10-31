import { $generateJSONFromSelectedNodes } from '@lexical/clipboard'
import { BaseSerializedNode } from '@lexical/clipboard/clipboard'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import * as Dialog from '@radix-ui/react-dialog'
import { $getSelection } from 'lexical'
import { useCallback, useEffect, useState } from 'react'

import CreateTemplateDialogContent from '../../../CreateTemplateDialog'

export default function TemplatePopoverPlugin({
  anchorElement,
  contentEditableElement,
}: {
  anchorElement: HTMLElement | null
  contentEditableElement: HTMLElement | null
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext()
  const [position, setPosition] = useState<{
    top: number
    left: number
  } | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const getSelectedSerializedNodes = useCallback(():
    | BaseSerializedNode[]
    | null => {
    if (!editor) return null
    let selectedNodes: BaseSerializedNode[] | null = null
    editor.update(() => {
      const selection = $getSelection()
      if (!selection) return
      selectedNodes = $generateJSONFromSelectedNodes(editor, selection).nodes
      if (selectedNodes.length === 0) return null
    })
    return selectedNodes
  }, [editor])

  const updatePopoverPosition = useCallback(() => {
    if (!anchorElement || !contentEditableElement) return
    const nativeSelection = document.getSelection()
    const range = nativeSelection?.getRangeAt(0)
    if (!range || range.collapsed) {
      setIsOpen(false)
      return
    }
    if (!contentEditableElement.contains(range.commonAncestorContainer)) {
      setIsOpen(false)
      return
    }
    const rects = Array.from(range.getClientRects())
    // FIXME: Implement better positioning logic
    // set position relative to anchorElement
    const anchorRect = anchorElement.getBoundingClientRect()
    setPosition({
      top: rects[rects.length - 1].bottom - anchorRect.top,
      left: rects[rects.length - 1].right - anchorRect.left,
    })

    const selectedNodes = getSelectedSerializedNodes()
    if (!selectedNodes) {
      setIsOpen(false)
      return
    }
    setIsOpen(true)
  }, [anchorElement, contentEditableElement, getSelectedSerializedNodes])

  useEffect(() => {
    const handleSelectionChange = () => {
      updatePopoverPosition()
    }
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [updatePopoverPosition])

  useEffect(() => {
    if (!contentEditableElement) return
    const handleScroll = () => {
      updatePopoverPosition()
    }
    contentEditableElement.addEventListener('scroll', handleScroll)
    return () => {
      contentEditableElement.removeEventListener('scroll', handleScroll)
    }
  }, [contentEditableElement, updatePopoverPosition])

  useEffect(() => {
    const removeUpdateListener = editor.registerUpdateListener(() => {
      updatePopoverPosition()
    })
    return () => {
      removeUpdateListener()
    }
  }, [editor, updatePopoverPosition])

  return (
    <Dialog.Root modal={false}>
      <Dialog.Trigger asChild>
        {isOpen ? (
          <button
            style={{
              position: 'absolute', // relative to anchorElement
              top: position?.top,
              left: position?.left,
            }}
          >
            Create template
          </button>
        ) : null}
      </Dialog.Trigger>
      <CreateTemplateDialogContent
        selectedSerializedNodes={getSelectedSerializedNodes()}
      />
    </Dialog.Root>
  )
}
