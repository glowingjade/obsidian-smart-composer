import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

import {
  LLMOptions,
  LLMRequestNonStreaming,
  LLMRequestStreaming,
} from '../types/llm/request'
import {
  LLMResponseNonStreaming,
  LLMResponseStreaming,
} from '../types/llm/response'
import LLMManager from '../utils/llm/manager'

import { useSettings } from './settings-context'

export type LLMContextType = {
  generateResponse: (
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ) => Promise<LLMResponseNonStreaming>
  streamResponse: (
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ) => Promise<AsyncIterable<LLMResponseStreaming>>
}

const LLMContext = createContext<LLMContextType | null>(null)

export function LLMProvider({ children }: PropsWithChildren) {
  const [llmManager, setLLMManager] = useState<LLMManager | null>(null)
  const { settings } = useSettings()

  useEffect(() => {
    const manager = new LLMManager({
      openai: settings.openAIApiKey,
      groq: settings.groqApiKey,
      anthropic: settings.anthropicApiKey,
    })
    setLLMManager(manager)
  }, [settings.openAIApiKey, settings.groqApiKey, settings.anthropicApiKey])

  const generateResponse = useCallback(
    async (request: LLMRequestNonStreaming, options?: LLMOptions) => {
      if (!llmManager) {
        throw new Error('LLMManager is not initialized')
      }
      return await llmManager.generateResponse(request, options)
    },
    [llmManager],
  )

  const streamResponse = useCallback(
    async (request: LLMRequestStreaming, options?: LLMOptions) => {
      if (!llmManager) {
        throw new Error('LLMManager is not initialized')
      }
      return await llmManager.streamResponse(request, options)
    },
    [llmManager],
  )

  return (
    <LLMContext.Provider value={{ generateResponse, streamResponse }}>
      {children}
    </LLMContext.Provider>
  )
}

export function useLLM() {
  const context = useContext(LLMContext)
  if (!context) {
    throw new Error('useLLM must be used within an LLMProvider')
  }
  return context
}
