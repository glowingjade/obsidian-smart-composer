import { useQuery } from '@tanstack/react-query'
import { $nodesOfType, LexicalEditor, SerializedEditorState } from 'lexical'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useApp } from '../../../contexts/app-context'
import {
  Mentionable,
  MentionableImage,
  SerializedMentionable,
} from '../../../types/mentionable'
import {
  deserializeMentionable,
  getMentionableKey,
  serializeMentionable,
} from '../../../utils/chat/mentionable'
import { fileToMentionableImage } from '../../../utils/llm/image'
import { openMarkdownFile, readTFileContent } from '../../../utils/obsidian'
import { ObsidianMarkdown } from '../ObsidianMarkdown'

import { ImageUploadButton } from './ImageUploadButton'
import LexicalContentEditable from './LexicalContentEditable'
import MentionableBadge from './MentionableBadge'
import { ModelSelect } from './ModelSelect'
import { MentionNode } from './plugins/mention/MentionNode'
import { NodeMutations } from './plugins/on-mutation/OnMutationPlugin'
import { SubmitButton } from './SubmitButton'
import { TemplateSelectButton } from './TemplateSelectButton'
import ToolBadge from './ToolBadge'
import { VaultChatButton } from './VaultChatButton'
import CreateTemplateDialogContent from '../CreateTemplateDialog'
import { Template } from '../../../database/json/template/types'
import { BaseSerializedNode } from '@lexical/clipboard/clipboard'
import * as Dialog from '@radix-ui/react-dialog'

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

    const editorRef = useRef<LexicalEditor | null>(null)
    const contentEditableRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const [displayedMentionableKey, setDisplayedMentionableKey] = useState<
      string | null
    >(addedBlockKey ?? null)

    // Shared template dialog state
    const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
    const [templateDialogData, setTemplateDialogData] = useState<{
      selectedSerializedNodes?: BaseSerializedNode[] | null
      editingTemplate?: Template
    }>({})

    // Function to open template dialog for creating from selection
    const openCreateTemplateDialog = useCallback((selectedSerializedNodes: BaseSerializedNode[] | null) => {
      setTemplateDialogData({ selectedSerializedNodes })
      setIsTemplateDialogOpen(true)
    }, [])

    // Function to open template dialog for editing
    const openEditTemplateDialog = useCallback((template: Template) => {
      setTemplateDialogData({ editingTemplate: template })
      setIsTemplateDialogOpen(true)
    }, [])

    // Function to close template dialog
    const closeTemplateDialog = useCallback(() => {
      setIsTemplateDialogOpen(false)
      setTemplateDialogData({})
    }, [])

    // Handle dialog open change with better control
    const handleDialogOpenChange = useCallback((open: boolean) => {
      // Only allow closing the dialog if it was explicitly requested
      // This prevents accidental closing from dropdown menu events
      if (!open) {
        // Add a small delay to prevent race conditions
        setTimeout(() => {
          closeTemplateDialog()
        }, 50)
      }
    }, [closeTemplateDialog])

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

    const handleCreateImageMentionables = useCallback(
      (mentionableImages: MentionableImage[]) => {
        const newMentionableImages = mentionableImages.filter(
          (m) =>
            !mentionables.some(
              (mentionable) =>
                getMentionableKey(serializeMentionable(mentionable)) ===
                getMentionableKey(serializeMentionable(m)),
            ),
        )
        if (newMentionableImages.length === 0) return
        setMentionables([...mentionables, ...newMentionableImages])
        setDisplayedMentionableKey(
          getMentionableKey(
            serializeMentionable(
              newMentionableImages[newMentionableImages.length - 1],
            ),
          ),
        )
      },
      [mentionables, setMentionables],
    )

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

    const handleUploadImages = async (images: File[]) => {
      const mentionableImages = await Promise.all(
        images.map((image) => fileToMentionableImage(image)),
      )
      handleCreateImageMentionables(mentionableImages)
    }

    const handleSubmit = (options: { useVaultSearch?: boolean } = {}) => {
      const content = editorRef.current?.getEditorState()?.toJSON()
      content && onSubmit(content, options.useVaultSearch)
    }

    return (
      <div className="smtcmp-chat-user-input-container" ref={containerRef}>
        <div className="smtcmp-chat-user-input-files">
          <ToolBadge />
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
              isFocused={
                getMentionableKey(serializeMentionable(m)) ===
                displayedMentionableKey
              }
            />
          ))}
        </div>

        <MentionableContentPreview
          displayedMentionableKey={displayedMentionableKey}
          mentionables={mentionables}
        />

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
          onCreateImageMentionables={handleCreateImageMentionables}
          autoFocus={autoFocus}
          plugins={{
            onEnter: {
              onVaultChat: () => {
                handleSubmit({ useVaultSearch: true })
              },
            },
            templatePopover: {
              anchorElement: containerRef.current,
              onOpenCreateDialog: openCreateTemplateDialog,
            },
          }}
        />

        <div className="smtcmp-chat-user-input-controls">
          <div className="smtcmp-chat-user-input-controls__model-select-container">
            <ModelSelect />
            <TemplateSelectButton onOpenEditDialog={openEditTemplateDialog} />
          </div>
          <div className="smtcmp-chat-user-input-controls__buttons">
            <ImageUploadButton onUpload={handleUploadImages} />
            <SubmitButton onClick={() => handleSubmit()} />
            <VaultChatButton
              onClick={() => {
                handleSubmit({ useVaultSearch: true })
              }}
            />
          </div>
        </div>

        {/* Shared Template Dialog */}
        <Dialog.Root modal={false} open={isTemplateDialogOpen} onOpenChange={handleDialogOpenChange}>
          <CreateTemplateDialogContent
            selectedSerializedNodes={templateDialogData.selectedSerializedNodes}
            editingTemplate={templateDialogData.editingTemplate}
            onClose={closeTemplateDialog}
          />
        </Dialog.Root>
      </div>
    )
  },
)

function MentionableContentPreview({
  displayedMentionableKey,
  mentionables,
}: {
  displayedMentionableKey: string | null
  mentionables: Mentionable[]
}) {
  const app = useApp()

  const displayedMentionable: Mentionable | null = useMemo(() => {
    return (
      mentionables.find(
        (m) =>
          getMentionableKey(serializeMentionable(m)) ===
          displayedMentionableKey,
      ) ?? null
    )
  }, [displayedMentionableKey, mentionables])

  const { data: displayFileContent } = useQuery({
    enabled:
      !!displayedMentionable &&
      ['file', 'current-file', 'block'].includes(displayedMentionable.type),
    queryKey: [
      'file',
      displayedMentionableKey,
      mentionables.map((m) => getMentionableKey(serializeMentionable(m))), // should be updated when mentionables change (especially on delete)
    ],
    queryFn: async () => {
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

  const displayImage: MentionableImage | null = useMemo(() => {
    return displayedMentionable?.type === 'image' ? displayedMentionable : null
  }, [displayedMentionable])

  return displayFileContent ? (
    <div className="smtcmp-chat-user-input-file-content-preview">
      <ObsidianMarkdown content={displayFileContent} scale="xs" />
    </div>
  ) : displayImage ? (
    <div className="smtcmp-chat-user-input-file-content-preview">
      <img src={displayImage.data} alt={displayImage.name} />
    </div>
  ) : null
}

ChatUserInput.displayName = 'ChatUserInput'

export default ChatUserInput
