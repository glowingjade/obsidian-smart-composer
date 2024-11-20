import { ANTHROPIC_PRICES, GROQ_PRICES, OPENAI_PRICES } from '../constants'
import { LLMModel } from '../types/llm/model'
import { ResponseUsage } from '../types/llm/response'

// Returns the cost in dollars. Returns null if the model is not supported.
export const calculateLLMCost = ({
  model,
  usage,
}: {
  model: LLMModel
  usage: ResponseUsage
}): number | null => {
  switch (model.provider) {
    case 'openai': {
      const modelPricing = OPENAI_PRICES[model.model]
      if (!modelPricing) return null
      return (
        (usage.prompt_tokens * modelPricing.input +
          usage.completion_tokens * modelPricing.output) /
        1_000_000
      )
    }
    case 'anthropic': {
      const modelPricing = ANTHROPIC_PRICES[model.model]
      if (!modelPricing) return null
      return (
        (usage.prompt_tokens * modelPricing.input +
          usage.completion_tokens * modelPricing.output) /
        1_000_000
      )
    }
    case 'groq': {
      const modelPricing = GROQ_PRICES[model.model]
      if (!modelPricing) return null
      return (
        (usage.prompt_tokens * modelPricing.input +
          usage.completion_tokens * modelPricing.output) /
        1_000_000
      )
    }
    default:
      return null
  }
}
