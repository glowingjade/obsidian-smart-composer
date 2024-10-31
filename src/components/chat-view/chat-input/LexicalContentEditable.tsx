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
import { RefObject, useCallback } from 'react'

import { useApp } from '../../../contexts/app-context'
import { fuzzySearch } from '../../../utils/fuzzy-search'

import OnVaultChatCommandPlugin from './on-vault-chat/OnVaultChatPlugin'
import AutoFocusPlugin from './plugins/auto-focus/AutoFocusPlugin'
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
  onSubmit?: () => void
  onFocus?: () => void
  onMentionNodeMutation?: (mutations: NodeMutations<MentionNode>) => void
  initialEditorState?: InitialEditorStateType
  autoFocus?: boolean
  plugins?: {
    vaultChat?: {
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
  onSubmit,
  onFocus,
  onMentionNodeMutation,
  initialEditorState,
  autoFocus = false,
  plugins,
}: LexicalContentEditableProps) {
  const app = useApp()

  // // initialize editor state
  // useEffect(() => {
  //   if (initialContent) {
  //     updaterRef.current?.update(initialContent)
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [])

  const initialConfig: InitialConfigType = {
    namespace: 'ChatUserInput',
    theme: {
      root: 'smtcmp-chat-input-root', // FIXME: change class name
      paragraph: 'smtcmp-chat-input-paragraph',
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
      {autoFocus && <AutoFocusPlugin defaultSelection="rootEnd" />}
      <MentionPlugin searchResultByQuery={searchResultByQuery} />
      <OnChangePlugin
        onChange={(editorState) => {
          onChange?.(editorState.toJSON())
        }}
      />
      {plugins?.vaultChat && (
        // This plugin should be registered before OnEnterPlugin
        <OnVaultChatCommandPlugin onVaultChat={plugins.vaultChat.onVaultChat} />
      )}
      <OnEnterPlugin
        onEnter={(evt) => {
          evt.preventDefault()
          evt.stopPropagation()
          onSubmit?.()
        }}
      />
      <OnMutationPlugin
        nodeClass={MentionNode}
        onMutation={(mutations) => {
          onMentionNodeMutation?.(mutations)
        }}
      />
      <EditorRefPlugin editorRef={editorRef} />
      <NoFormatPlugin />
      <AutoLinkMentionPlugin />
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
