import { useQuery } from '@tanstack/react-query'
import { $nodesOfType, LexicalEditor, SerializedEditorState } from 'lexical'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'

import { useApp } from '../../../contexts/app-context'
import { useDarkModeContext } from '../../../contexts/dark-mode-context'
import { Mentionable, SerializedMentionable } from '../../../types/mentionable'
import {
  deserializeMentionable,
  getMentionableKey,
  serializeMentionable,
} from '../../../utils/mentionable'
import { openMarkdownFile, readTFileContent } from '../../../utils/obsidian'
import { MemoizedSyntaxHighlighterWrapper } from '../SyntaxHighlighterWrapper'

import LexicalContentEditable from './LexicalContentEditable'
import MentionableBadge from './MentionableBadge'
import { ModelSelect } from './ModelSelect'
import { MentionNode } from './plugins/mention/MentionNode'
import { NodeMutations } from './plugins/on-mutation/OnMutationPlugin'
import { SubmitButton } from './SubmitButton'
import { VaultChatButton } from './VaultChatButton'

export type ChatUserInputRef = {
  focus: () => void
}

export type ChatUserInputProps = {
  initialSerializedEditorState: SerializedEditorState | null
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
      initialSerializedEditorState,
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
    const containerRef = useRef<HTMLDivElement>(null)

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

    const handleSubmit = (options: { useVaultSearch?: boolean } = {}) => {
      const content = editorRef.current?.getEditorState()?.toJSON()
      content && onSubmit(content, options.useVaultSearch)
    }

    return (
      <div className="smtcmp-chat-user-input-container" ref={containerRef}>
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
                    openMarkdownFile(
                      app,
                      m.file.path,
                      m.type === 'block' ? m.startLine : undefined,
                    )
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

        <LexicalContentEditable
          initialEditorState={(editor) => {
            if (initialSerializedEditorState) {
              editor.setEditorState(
                editor.parseEditorState(initialSerializedEditorState),
              )
            }
          }}
          editorRef={editorRef}
          contentEditableRef={contentEditableRef}
          onChange={onChange}
          onEnter={() => handleSubmit({ useVaultSearch: false })}
          onFocus={onFocus}
          onMentionNodeMutation={handleMentionNodeMutation}
          autoFocus={autoFocus}
          plugins={{
            onEnter: {
              onVaultChat: () => {
                handleSubmit({ useVaultSearch: true })
              },
            },
            templatePopover: {
              anchorElement: containerRef.current,
            },
          }}
        />

        <div className="smtcmp-chat-user-input-controls">
          <ModelSelect />
          <div className="smtcmp-chat-user-input-controls-buttons">
            <SubmitButton onClick={() => handleSubmit()} />
            <VaultChatButton
              onClick={() => {
                handleSubmit({ useVaultSearch: true })
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
