import { ChatModel } from '../../types/chat-model.types'

import { calculateLLMCost } from './price-calculator'

const usage = {
  prompt_tokens: 1_000_000,
  completion_tokens: 1_000_000,
  total_tokens: 2_000_000,
}

describe('calculateLLMCost', () => {
  it.each([
    ['openai', 'gpt-5.6-sol', 24],
    ['anthropic', 'claude-opus-5', 30],
    ['xai', 'grok-4.6', 8],
    ['deepseek', 'deepseek-v4-pro', 5.28],
  ] as const)('should price %s/%s', (providerType, model, expected) => {
    expect(
      calculateLLMCost({
        model: {
          providerType,
          providerId: providerType,
          id: model,
          model,
        } as ChatModel,
        usage,
      }),
    ).toBe(expected)
  })

  it('should use long-context Gemini pricing above 200K prompt tokens', () => {
    const model = {
      providerType: 'gemini',
      providerId: 'gemini',
      id: 'gemini-3.1-pro-preview',
      model: 'gemini-3.1-pro-preview',
    } as ChatModel

    expect(
      calculateLLMCost({
        model,
        usage: {
          prompt_tokens: 200_000,
          completion_tokens: 100_000,
          total_tokens: 300_000,
        },
      }),
    ).toBe(1.6)
    expect(
      calculateLLMCost({
        model,
        usage: {
          prompt_tokens: 200_001,
          completion_tokens: 100_000,
          total_tokens: 300_001,
        },
      }),
    ).toBeCloseTo(2.600004)
  })
})
