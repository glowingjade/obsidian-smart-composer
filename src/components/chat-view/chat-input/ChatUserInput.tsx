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
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { useQuery } from '@tanstack/react-query'
import { $nodesOfType, LexicalEditor, SerializedEditorState } from 'lexical'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import {
  deserializeMentionable,
  serializeMentionable,
} from 'src/utils/mentionable'

import { useApp } from '../../../contexts/app-context'
import { useDarkModeContext } from '../../../contexts/dark-mode-context'
import { Mentionable, SerializedMentionable } from '../../../types/mentionable'
import { fuzzySearch } from '../../../utils/fuzzy-search'
import { getMentionableKey } from '../../../utils/mentionable'
import { openMarkdownFile, readTFileContent } from '../../../utils/obsidian'
import { MemoizedSyntaxHighlighterWrapper } from '../SyntaxHighlighterWrapper'

import MentionableBadge from './MentionableBadge'
import { ModelSelect } from './ModelSelect'
import AutoLinkMentionPlugin from './plugins/mention/AutoLinkMentionPlugin'
import { MentionNode } from './plugins/mention/MentionNode'
import MentionPlugin from './plugins/mention/MentionPlugin'
import NoFormatPlugin from './plugins/no-format/NoFormatPlugin'
import OnEnterPlugin from './plugins/on-enter/OnEnterPlugin'
import OnMutationPlugin, {
  NodeMutations,
} from './plugins/on-mutation/OnMutationPlugin'
import UpdaterPlugin, {
  UpdaterPluginRef,
} from './plugins/updater/UpdaterPlugin'
import { SubmitButton } from './SubmitButton'
import { VaultChatButton } from './VaultChatButton'

export type ChatUserInputRef = {
  focus: () => void
}

export type ChatUserInputProps = {
  message: SerializedEditorState | null // TODO: fix name to initialContent
  onChange: (content: SerializedEditorState) => void
  onSubmit: (content: SerializedEditorState, useVaultSearch?: boolean) => void
  onFocus: () => void
  mentionables: Mentionable[]
  setMentionables: (mentionables: Mentionable[]) => void
  autoFocus?: boolean
  addedBlockKey?: string | null
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
      addedBlockKey,
    },
    ref,
  ) => {
    const app = useApp()
    const { isDarkMode } = useDarkModeContext()

    const editorRef = useRef<LexicalEditor | null>(null)
    const contentEditableRef = useRef<HTMLDivElement>(null)
    const updaterRef = useRef<UpdaterPluginRef | null>(null)

    const [displayedMentionableKey, setDisplayedMentionableKey] = useState<
      string | null
    >(addedBlockKey ?? null)

    useEffect(() => {
      if (addedBlockKey) {
        setDisplayedMentionableKey(addedBlockKey)
      }
    }, [addedBlockKey])

    useImperativeHandle(ref, () => ({
      focus: () => {
        contentEditableRef.current?.focus()
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const searchResultByQuery = useCallback(
      (query: string) => fuzzySearch(app, query),
      [app],
    )

    const handleMentionNodeMutation = (
      mutations: NodeMutations<MentionNode>,
    ) => {
      const destroyedMentionableKeys: string[] = []
      const addedMentionables: SerializedMentionable[] = []
      mutations.forEach((mutation) => {
        const mentionable = mutation.node.getMentionable()
        const mentionableKey = getMentionableKey(mentionable)

        if (mutation.mutation === 'destroyed') {
          const nodeWithSameMentionable = editorRef.current?.read(() =>
            $nodesOfType(MentionNode).find(
              (node) =>
                getMentionableKey(node.getMentionable()) === mentionableKey,
            ),
          )

          if (!nodeWithSameMentionable) {
            // remove mentionable only if it's not present in the editor state
            destroyedMentionableKeys.push(mentionableKey)
          }
        } else if (mutation.mutation === 'created') {
          if (
            mentionables.some(
              (m) =>
                getMentionableKey(serializeMentionable(m)) === mentionableKey,
            ) ||
            addedMentionables.some(
              (m) => getMentionableKey(m) === mentionableKey,
            )
          ) {
            // do nothing if mentionable is already added
            return
          }

          addedMentionables.push(mentionable)
        }
      })

      setMentionables(
        mentionables
          .filter(
            (m) =>
              !destroyedMentionableKeys.includes(
                getMentionableKey(serializeMentionable(m)),
              ),
          )
          .concat(
            addedMentionables
              .map((m) => deserializeMentionable(m, app))
              .filter((v) => !!v),
          ),
      )
      if (addedMentionables.length > 0) {
        setDisplayedMentionableKey(
          getMentionableKey(addedMentionables[addedMentionables.length - 1]),
        )
      }
    }

    const handleMentionableDelete = (mentionable: Mentionable) => {
      const mentionableKey = getMentionableKey(
        serializeMentionable(mentionable),
      )
      setMentionables(
        mentionables.filter(
          (m) => getMentionableKey(serializeMentionable(m)) !== mentionableKey,
        ),
      )

      editorRef.current?.update(() => {
        $nodesOfType(MentionNode).forEach((node) => {
          if (getMentionableKey(node.getMentionable()) === mentionableKey) {
            node.remove()
          }
        })
      })
    }

    const { data: fileContent } = useQuery({
      queryKey: [
        'file',
        displayedMentionableKey,
        mentionables.map((m) => getMentionableKey(serializeMentionable(m))), // should be updated when mentionables change (especially on delete)
      ],
      queryFn: async () => {
        if (!displayedMentionableKey) return null

        const displayedMentionable = mentionables.find(
          (m) =>
            getMentionableKey(serializeMentionable(m)) ===
            displayedMentionableKey,
        )

        if (!displayedMentionable) return null

        if (
          displayedMentionable.type === 'file' ||
          displayedMentionable.type === 'current-file'
        ) {
          if (!displayedMentionable.file) return null
          return await readTFileContent(displayedMentionable.file, app.vault)
        } else if (displayedMentionable.type === 'block') {
          const fileContent = await readTFileContent(
            displayedMentionable.file,
            app.vault,
          )

          return fileContent
            .split('\n')
            .slice(
              displayedMentionable.startLine - 1,
              displayedMentionable.endLine,
            )
            .join('\n')
        }

        return null
      },
    })

    const handleSubmit = (useVaultSearch?: boolean) => {
      const content = editorRef.current?.getEditorState()?.toJSON()
      content && onSubmit(content, useVaultSearch)
    }

    return (
      <div className="smtcmp-chat-user-input-container">
        {mentionables.length > 0 && (
          <div className="smtcmp-chat-user-input-files">
            {mentionables.map((m) => (
              <MentionableBadge
                key={getMentionableKey(serializeMentionable(m))}
                mentionable={m}
                onDelete={() => handleMentionableDelete(m)}
                onClick={() => {
                  const mentionableKey = getMentionableKey(
                    serializeMentionable(m),
                  )
                  if (
                    (m.type === 'current-file' ||
                      m.type === 'file' ||
                      m.type === 'block') &&
                    m.file &&
                    mentionableKey === displayedMentionableKey
                  ) {
                    // open file on click again
                    openMarkdownFile(app, m.file.path)
                  } else {
                    setDisplayedMentionableKey(mentionableKey)
                  }
                }}
              />
            ))}
          </div>
        )}

        {fileContent && (
          <div className="smtcmp-chat-user-input-file-content-preview">
            <MemoizedSyntaxHighlighterWrapper
              isDarkMode={isDarkMode}
              language="markdown"
              hasFilename={false}
              wrapLines={false}
            >
              {fileContent}
            </MemoizedSyntaxHighlighterWrapper>
          </div>
        )}

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
          {autoFocus && <AutoFocusPlugin />}
          <MentionPlugin searchResultByQuery={searchResultByQuery} />
          <OnChangePlugin
            onChange={(editorState) => {
              onChange(editorState.toJSON())
            }}
          />
          <UpdaterPlugin updaterRef={updaterRef} />
          <OnEnterPlugin
            onEnter={(evt, useVaultSearch?: boolean) => {
              evt.preventDefault()
              evt.stopPropagation()
              handleSubmit(useVaultSearch)
            }}
          />
          <OnMutationPlugin
            nodeClass={MentionNode}
            onMutation={handleMentionNodeMutation}
          />
          <EditorRefPlugin editorRef={editorRef} />
          <NoFormatPlugin />
          <AutoLinkMentionPlugin />
        </LexicalComposer>
        <div className="smtcmp-chat-user-input-controls">
          <ModelSelect />
          <div className="smtcmp-chat-user-input-controls-buttons">
            <SubmitButton onClick={() => handleSubmit()} />
            <VaultChatButton
              onClick={() => {
                handleSubmit(true)
              }}
            />
          </div>
        </div>
      </div>
    )
  },
)

ChatUserInput.displayName = 'ChatUserInput'

export default ChatUserInput
