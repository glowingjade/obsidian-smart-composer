import { $generateJSONFromSelectedNodes } from '@lexical/clipboard'
import { BaseSerializedNode } from '@lexical/clipboard/clipboard'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection,
  COMMAND_PRIORITY_LOW,
  SELECTION_CHANGE_COMMAND,
} from 'lexical'
import { CSSProperties, useCallback, useEffect, useRef, useState } from 'react'

export default function CreateTemplatePopoverPlugin({
  anchorElement,
  contentEditableElement,
  onOpenCreateDialog,
}: {
  anchorElement: HTMLElement | null
  contentEditableElement: HTMLElement | null
  onOpenCreateDialog: (selectedSerializedNodes: BaseSerializedNode[] | null) => void
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext()

  const [popoverStyle, setPopoverStyle] = useState<CSSProperties | null>(null)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  const popoverRef = useRef<HTMLButtonElement>(null)

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
      setIsPopoverOpen(false)
      return
    }
    if (!contentEditableElement.contains(range.commonAncestorContainer)) {
      setIsPopoverOpen(false)
      return
    }
    const rects = Array.from(range.getClientRects())
    if (rects.length === 0) {
      setIsPopoverOpen(false)
      return
    }
    const anchorRect = anchorElement.getBoundingClientRect()
    const idealLeft = rects[rects.length - 1].right - anchorRect.left
    const paddingX = 8
    const paddingY = 4
    const minLeft = (popoverRef.current?.offsetWidth ?? 0) + paddingX
    const finalLeft = Math.max(minLeft, idealLeft)
    setPopoverStyle({
      top: rects[rects.length - 1].bottom - anchorRect.top + paddingY,
      left: finalLeft,
      transform: 'translate(-100%, 0)',
    })
    setIsPopoverOpen(true)
  }, [anchorElement, contentEditableElement])

  useEffect(() => {
    const removeSelectionChangeListener = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updatePopoverPosition()
        return false
      },
      COMMAND_PRIORITY_LOW,
    )
    return () => {
      removeSelectionChangeListener()
    }
  }, [editor, updatePopoverPosition])

  useEffect(() => {
    // Update popover position when the content is cleared
    // (Selection change event doesn't fire in this case)
    if (!isPopoverOpen) return
    const removeTextContentChangeListener = editor.registerTextContentListener(
      () => {
        updatePopoverPosition()
      },
    )
    return () => {
      removeTextContentChangeListener()
    }
  }, [editor, isPopoverOpen, updatePopoverPosition])

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

  return (
    <button
      ref={popoverRef}
      style={{
        position: 'absolute',
        visibility: isPopoverOpen ? 'visible' : 'hidden',
        ...popoverStyle,
      }}
      onClick={() => {
        const selectedNodes = getSelectedSerializedNodes()
        onOpenCreateDialog(selectedNodes)
        setIsPopoverOpen(false)
      }}
    >
      Create template
    </button>
  )
}
