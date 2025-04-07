import { ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'

export default function AssistantMessageReasoning({
  reasoning,
}: {
  reasoning: string
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showLoader, setShowLoader] = useState(false)
  const previousReasoning = useRef(reasoning)
  const hasUserInteracted = useRef(false)

  useEffect(() => {
    if (
      previousReasoning.current !== reasoning &&
      previousReasoning.current !== ''
    ) {
      setShowLoader(true)
      if (!hasUserInteracted.current) {
        setIsExpanded(true)
      }
      const timer = setTimeout(() => {
        setShowLoader(false)
      }, 1000)
      return () => clearTimeout(timer)
    }
    previousReasoning.current = reasoning
  }, [reasoning])

  const handleToggle = () => {
    hasUserInteracted.current = true
    setIsExpanded(!isExpanded)
  }

  return (
    <div className="smtcmp-assistant-message-metadata">
      <div
        className="smtcmp-assistant-message-metadata-toggle"
        onClick={handleToggle}
      >
        <span>Reasoning {showLoader && <DotLoader />}</span>
        {isExpanded ? (
          <ChevronUp className="smtcmp-assistant-message-metadata-toggle-icon" />
        ) : (
          <ChevronDown className="smtcmp-assistant-message-metadata-toggle-icon" />
        )}
      </div>
      {isExpanded && (
        <div className="smtcmp-assistant-message-metadata-content">
          <Markdown className="smtcmp-markdown">{reasoning}</Markdown>
        </div>
      )}
    </div>
  )
}

function DotLoader() {
  return <span className="smtcmp-dot-loader" aria-label="Loading"></span>
}
