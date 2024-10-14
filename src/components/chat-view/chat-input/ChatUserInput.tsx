import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import {
  InitialConfigType,
  LexicalComposer,
} from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { EditorRefPlugin } from '@lexical/react/LexicalEditorRefPlugin'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import { $nodesOfType, LexicalEditor, SerializedEditorState } from 'lexical'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'

import { useApp } from '../../../contexts/app-context'
import { Mentionable } from '../../../types/mentionable'

import MentionableBadge from './MentionableBadge'
import { MentionNode } from './plugins/mention/MentionNode'
import MentionPlugin from './plugins/mention/MentionPlugin'
import OnEnterPlugin from './plugins/on-enter/OnEnterPlugin'
import OnMutationPlugin, {
  NodeMutations,
} from './plugins/on-mutation/OnMutationPlugin'
import UpdaterPlugin, {
  UpdaterPluginRef,
} from './plugins/updater/UpdaterPlugin'
import { editorStateToPlainText } from './utils/editor-state-to-plain-text'

export type ChatUserInputRef = {
  focus: () => void
  clear: () => void
}

export type ChatUserInputProps = {
  message: SerializedEditorState | null // TODO: fix name to initialContent
  onChange: (content: SerializedEditorState) => void
  onSubmit: (content: SerializedEditorState) => void
  onFocus: () => void
  mentionables: Mentionable[]
  setMentionables: (mentionables: Mentionable[]) => void
  readonly?: boolean
  autoFocus?: boolean
}

const ChatUserInput = forwardRef<ChatUserInputRef, ChatUserInputProps>(
  (
    {
      message,
      onChange,
      onSubmit,
      onFocus,
      mentionables,
      setMentionables,
      autoFocus = false,
      readonly = false,
    },
    ref,
  ) => {
    const app = useApp()

    const editorRef = useRef<LexicalEditor | null>(null)
    const contentEditableRef = useRef<HTMLDivElement>(null)
    const updaterRef = useRef<UpdaterPluginRef | null>(null)

    useImperativeHandle(ref, () => ({
      focus: () => {
        contentEditableRef.current?.focus()
      },
      clear: () => {
        updaterRef.current?.clear()
      },
    }))

    const initialConfig: InitialConfigType = {
      namespace: 'ChatUserInput',
      theme: {
        root: 'smtcmp-chat-input-root',
        paragraph: 'smtcmp-chat-input-paragraph',
      },
      nodes: [MentionNode],
      onError: (error) => {
        console.error(error)
      },
    }

    // initialize editor state
    useEffect(() => {
      if (message) {
        updaterRef.current?.update(message)
      }
    }, [])

    const searchFilesByQuery = useCallback(
      (query: string) => {
        const allFiles = app.vault.getFiles()
        const filteredFiles =
          query === ''
            ? allFiles
            : allFiles.filter((file) =>
                file.path.toLowerCase().includes(query.toLowerCase()),
              )
        return filteredFiles
      },
      [app.vault],
    )

    const handleMentionFile = (mentionable: Mentionable) => {
      if (mentionables.some((m) => m.id === mentionable.id)) {
        return
      }
      setMentionables([...mentionables, mentionable])
    }

    const handleMentionNodeMutation = (
      mutations: NodeMutations<MentionNode>,
    ) => {
      mutations.forEach((mutation) => {
        if (mutation.mutation !== 'destroyed') return

        const id = mutation.node.getId()

        const nodeWithSameId = editorRef.current?.read(() =>
          $nodesOfType(MentionNode).find((node) => node.getId() === id),
        )

        if (!nodeWithSameId) {
          // remove mentionable only if it's not present in the editor state
          setMentionables(mentionables.filter((m) => m.id !== id))
        }
      })
    }

    const handleMentionableDelete = (mentionable: Mentionable) => {
      setMentionables(mentionables.filter((m) => m.id !== mentionable.id))

      editorRef.current?.update(() => {
        $nodesOfType(MentionNode).forEach((node) => {
          if (node.getId() === mentionable.id) {
            node.remove()
          }
        })
      })
    }

    return (
      <div className="smtcmp-chat-user-input-container">
        <div className="smtcmp-chat-user-input-files">
          {mentionables.map((m) => (
            <MentionableBadge
              key={m.id}
              mentionable={m}
              onDelete={() => handleMentionableDelete(m)}
            />
          ))}
        </div>

        {readonly ? (
          <div className="obsidian-default-textarea">
            {/* TODO: fix new line style */}
            {message ? editorStateToPlainText(message) : ''}
          </div>
        ) : (
          <LexicalComposer initialConfig={initialConfig}>
            <PlainTextPlugin
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
            {autoFocus && <AutoFocusPlugin />}
            <MentionPlugin
              searchFilesByQuery={searchFilesByQuery}
              onAddMention={handleMentionFile}
            />
            <OnChangePlugin
              onChange={(editorState) => {
                onChange(editorState.toJSON())
              }}
            />
            <UpdaterPlugin updaterRef={updaterRef} />
            <OnEnterPlugin
              onEnter={(evt) => {
                evt.preventDefault()
                evt.stopPropagation()
                const content = editorRef.current?.getEditorState()?.toJSON()
                content && onSubmit(content)
              }}
            />
            <OnMutationPlugin
              nodeClass={MentionNode}
              onMutation={handleMentionNodeMutation}
            />
            <EditorRefPlugin editorRef={editorRef} />
          </LexicalComposer>
        )}
      </div>
    )
  },
)

export default ChatUserInput
