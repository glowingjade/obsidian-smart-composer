import { CornerDownLeftIcon } from 'lucide-react'

export function SubmitButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="smtcmp-chat-user-input-submit-button" onClick={onClick}>
      <div className="smtcmp-chat-user-input-submit-button-icons">
        <CornerDownLeftIcon size={12} />
      </div>
      <div>Chat</div>
    </button>
  )
}
