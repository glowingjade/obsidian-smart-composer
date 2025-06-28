// src/components/chat-view/chat-input/UserMessageItem.tsx

import { SerializedEditorState } from 'lexical'

import { ChatUserMessage } from '../../types/chat'
import { Mentionable } from '../../types/mentionable'

import ChatUserInput, { ChatUserInputRef } from './chat-input/ChatUserInput'
import SimilaritySearchResults from './SimilaritySearchResults'

export type UserMessageItemProps = {
  message: ChatUserMessage
  chatUserInputRef: (ref: ChatUserInputRef | null) => void
  onInputChange: (content: SerializedEditorState) => void
  onSubmit: (content: SerializedEditorState, useVaultSearch: boolean) => void
  onFocus: () => void
  onMentionablesChange: (mentionables: Mentionable[]) => void
  onDepthChange: (mentionableKey: string, forward: number, backward: number) => void;
}

export default function UserMessageItem({
  message,
  chatUserInputRef,
  onInputChange,
  onSubmit,
  onFocus,
  onMentionablesChange,
  onDepthChange,
}: UserMessageItemProps) {
  return (
    <div className="smtcmp-chat-messages-user">
      <ChatUserInput
        ref={chatUserInputRef}
        initialSerializedEditorState={message.content}
        onChange={onInputChange}
        onSubmit={onSubmit}
        onFocus={onFocus}
        mentionables={message.mentionables}
        setMentionables={onMentionablesChange}
        onDepthChange={onDepthChange}
      />
      {message.similaritySearchResults && (
        <SimilaritySearchResults
          similaritySearchResults={message.similaritySearchResults}
        />
      )}
    </div>
  )
}