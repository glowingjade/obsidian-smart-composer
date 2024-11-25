import {
  InitialConfigType,
  InitialEditorStateType,
  LexicalComposer,
} from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { EditorRefPlugin } from '@lexical/react/LexicalEditorRefPlugin'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { LexicalEditor, SerializedEditorState } from 'lexical'
import { RefObject, useCallback, useEffect } from 'react'

import { useApp } from '../../../contexts/app-context'
import { MentionableImage } from '../../../types/mentionable'
import { fuzzySearch } from '../../../utils/fuzzy-search'

import DragDropPaste from './plugins/image/DragDropPastePlugin'
import ImagePastePlugin from './plugins/image/ImagePastePlugin'
import AutoLinkMentionPlugin from './plugins/mention/AutoLinkMentionPlugin'
import { MentionNode } from './plugins/mention/MentionNode'
import MentionPlugin from './plugins/mention/MentionPlugin'
import NoFormatPlugin from './plugins/no-format/NoFormatPlugin'
import OnEnterPlugin from './plugins/on-enter/OnEnterPlugin'
import OnMutationPlugin, {
  NodeMutations,
} from './plugins/on-mutation/OnMutationPlugin'
import CreateTemplatePopoverPlugin from './plugins/template/CreateTemplatePopoverPlugin'
import TemplatePlugin from './plugins/template/TemplatePlugin'

export type LexicalContentEditableProps = {
  editorRef: RefObject<LexicalEditor>
  contentEditableRef: RefObject<HTMLDivElement>
  onChange?: (content: SerializedEditorState) => void
  onEnter?: (evt: KeyboardEvent) => void
  onFocus?: () => void
  onMentionNodeMutation?: (mutations: NodeMutations<MentionNode>) => void
  onCreateImageMentionables?: (mentionables: MentionableImage[]) => void
  initialEditorState?: InitialEditorStateType
  autoFocus?: boolean
  plugins?: {
    onEnter?: {
      onVaultChat: () => void
    }
    templatePopover?: {
      anchorElement: HTMLElement | null
    }
  }
}

export default function LexicalContentEditable({
  editorRef,
  contentEditableRef,
  onChange,
  onEnter,
  onFocus,
  onMentionNodeMutation,
  onCreateImageMentionables,
  initialEditorState,
  autoFocus = false,
  plugins,
}: LexicalContentEditableProps) {
  const app = useApp()

  const initialConfig: InitialConfigType = {
    namespace: 'LexicalContentEditable',
    theme: {
      root: 'smtcmp-lexical-content-editable-root',
      paragraph: 'smtcmp-lexical-content-editable-paragraph',
    },
    nodes: [MentionNode],
    editorState: initialEditorState,
    onError: (error) => {
      console.error(error)
    },
  }

  const searchResultByQuery = useCallback(
    (query: string) => fuzzySearch(app, query),
    [app],
  )

  /*
   * Using requestAnimationFrame for autoFocus instead of using editor.focus()
   * due to known issues with editor.focus() when initialConfig.editorState is set
   * See: https://github.com/facebook/lexical/issues/4460
   */
  useEffect(() => {
    if (autoFocus) {
      requestAnimationFrame(() => {
        contentEditableRef.current?.focus()
      })
    }
  }, [autoFocus, contentEditableRef])

  return (
    <LexicalComposer initialConfig={initialConfig}>
      {/* 
            There was two approach to make mentionable node copy and pasteable.
            1. use RichTextPlugin and reset text format when paste
              - so I implemented NoFormatPlugin to reset text format when paste
            2. use PlainTextPlugin and override paste command
              - PlainTextPlugin only pastes text, so we need to implement custom paste handler.
              - https://github.com/facebook/lexical/discussions/5112
           */}
      <RichTextPlugin
        contentEditable={
          <ContentEditable
            className="obsidian-default-textarea"
            style={{
              background: 'transparent',
            }}
            onFocus={onFocus}
            ref={contentEditableRef}
          />
        }
        ErrorBoundary={LexicalErrorBoundary}
      />
      <HistoryPlugin />
      <MentionPlugin searchResultByQuery={searchResultByQuery} />
      <OnChangePlugin
        onChange={(editorState) => {
          onChange?.(editorState.toJSON())
        }}
      />
      {onEnter && (
        <OnEnterPlugin
          onEnter={onEnter}
          onVaultChat={plugins?.onEnter?.onVaultChat}
        />
      )}
      <OnMutationPlugin
        nodeClass={MentionNode}
        onMutation={(mutations) => {
          onMentionNodeMutation?.(mutations)
        }}
      />
      <EditorRefPlugin editorRef={editorRef} />
      <NoFormatPlugin />
      <AutoLinkMentionPlugin />
      <ImagePastePlugin onCreateImageMentionables={onCreateImageMentionables} />
      <DragDropPaste onCreateImageMentionables={onCreateImageMentionables} />
      <TemplatePlugin />
      {plugins?.templatePopover && (
        <CreateTemplatePopoverPlugin
          anchorElement={plugins.templatePopover.anchorElement}
          contentEditableElement={contentEditableRef.current}
        />
      )}
    </LexicalComposer>
  )
}
