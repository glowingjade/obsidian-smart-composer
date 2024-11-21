import * as Popover from '@radix-ui/react-popover'
import {
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  Coins,
  Cpu,
  Info,
} from 'lucide-react'

import { ResponseUsage } from '../../types/llm/response'

type LLMResponseInfoProps = {
  usage?: ResponseUsage
  estimatedPrice: number | null
  model?: string
}

export default function LLMResponseInfoPopover({
  usage,
  estimatedPrice,
  model,
}: LLMResponseInfoProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button>
          <Info className="smtcmp-llm-info-icon--trigger" size={12} />
        </button>
      </Popover.Trigger>
      {usage ? (
        <Popover.Content className="smtcmp-popover-content smtcmp-llm-info-content">
          <div className="smtcmp-llm-info-header">LLM Response Information</div>
          <div className="smtcmp-llm-info-tokens">
            <div className="smtcmp-llm-info-tokens-header">Token Count</div>
            <div className="smtcmp-llm-info-tokens-grid">
              <div className="smtcmp-llm-info-token-row">
                <ArrowUp className="smtcmp-llm-info-icon--input" />
                <span>Input:</span>
                <span className="smtcmp-llm-info-token-value">
                  {usage.prompt_tokens}
                </span>
              </div>
              <div className="smtcmp-llm-info-token-row">
                <ArrowDown className="smtcmp-llm-info-icon--output" />
                <span>Output:</span>
                <span className="smtcmp-llm-info-token-value">
                  {usage.completion_tokens}
                </span>
              </div>
              <div className="smtcmp-llm-info-token-row smtcmp-llm-info-token-total">
                <ArrowRightLeft className="smtcmp-llm-info-icon--total" />
                <span>Total:</span>
                <span className="smtcmp-llm-info-token-value">
                  {usage.total_tokens}
                </span>
              </div>
            </div>
          </div>
          <div className="smtcmp-llm-info-footer-row">
            <Coins className="smtcmp-llm-info-icon--footer" />
            <span>Estimated Price:</span>
            <span className="smtcmp-llm-info-footer-value">
              {estimatedPrice === null
                ? 'Not available'
                : `$${estimatedPrice.toFixed(4)}`}
            </span>
          </div>
          <div className="smtcmp-llm-info-footer-row">
            <Cpu className="smtcmp-llm-info-icon--footer" />
            <span>Model:</span>
            <span className="smtcmp-llm-info-footer-value smtcmp-llm-info-model">
              {model ?? 'Not available'}
            </span>
          </div>
        </Popover.Content>
      ) : (
        <Popover.Content className="smtcmp-popover-content">
          <div>Usage statistics are not available for this model</div>
        </Popover.Content>
      )}
    </Popover.Root>
  )
}
