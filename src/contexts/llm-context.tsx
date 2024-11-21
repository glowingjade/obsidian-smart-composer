import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { APPLY_MODEL_OPTIONS, CHAT_MODEL_OPTIONS } from '../constants'
import LLMManager from '../core/llm/manager'
import { LLMModel } from '../types/llm/model'
import {
  LLMOptions,
  LLMRequestNonStreaming,
  LLMRequestStreaming,
} from '../types/llm/request'
import {
  LLMResponseNonStreaming,
  LLMResponseStreaming,
} from '../types/llm/response'

import { useSettings } from './settings-context'

export type LLMContextType = {
  generateResponse: (
    model: LLMModel,
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ) => Promise<LLMResponseNonStreaming>
  streamResponse: (
    model: LLMModel,
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ) => Promise<AsyncIterable<LLMResponseStreaming>>
  chatModel: LLMModel
  applyModel: LLMModel
}

const LLMContext = createContext<LLMContextType | null>(null)

export function LLMProvider({ children }: PropsWithChildren) {
  const [llmManager, setLLMManager] = useState<LLMManager | null>(null)
  const { settings } = useSettings()

  const chatModel = useMemo((): LLMModel => {
    const model = CHAT_MODEL_OPTIONS.find(
      (option) => option.id === settings.chatModelId,
    )?.model
    if (!model) {
      throw new Error('Invalid chat model ID')
    }
    if (model.provider === 'ollama') {
      return {
        provider: 'ollama',
        baseURL: settings.ollamaChatModel.baseUrl,
        model: settings.ollamaChatModel.model,
      }
    }
    if (model.provider === 'openai-compatible') {
      return {
        provider: 'openai-compatible',
        baseURL: settings.openAICompatibleChatModel.baseUrl,
        apiKey: settings.openAICompatibleChatModel.apiKey,
        model: settings.openAICompatibleChatModel.model,
      }
    }
    return model
  }, [settings])

  const applyModel = useMemo((): LLMModel => {
    const model = APPLY_MODEL_OPTIONS.find(
      (option) => option.id === settings.applyModelId,
    )?.model
    if (!model) {
      throw new Error('Invalid apply model ID')
    }
    if (model.provider === 'ollama') {
      return {
        provider: 'ollama',
        baseURL: settings.ollamaApplyModel.baseUrl,
        model: settings.ollamaApplyModel.model,
      }
    }
    if (model.provider === 'openai-compatible') {
      return {
        provider: 'openai-compatible',
        apiKey: settings.openAICompatibleApplyModel.apiKey,
        baseURL: settings.openAICompatibleApplyModel.baseUrl,
        model: settings.openAICompatibleApplyModel.model,
      }
    }
    return model
  }, [settings])

  useEffect(() => {
    const manager = new LLMManager({
      openai: settings.openAIApiKey,
      anthropic: settings.anthropicApiKey,
      gemini: settings.geminiApiKey,
      groq: settings.groqApiKey,
    })
    setLLMManager(manager)
  }, [
    settings.openAIApiKey,
    settings.anthropicApiKey,
    settings.geminiApiKey,
    settings.groqApiKey,
  ])

  const generateResponse = useCallback(
    async (
      model: LLMModel,
      request: LLMRequestNonStreaming,
      options?: LLMOptions,
    ) => {
      if (!llmManager) {
        throw new Error('LLMManager is not initialized')
      }
      return await llmManager.generateResponse(model, request, options)
    },
    [llmManager],
  )

  const streamResponse = useCallback(
    async (
      model: LLMModel,
      request: LLMRequestStreaming,
      options?: LLMOptions,
    ) => {
      if (!llmManager) {
        throw new Error('LLMManager is not initialized')
      }
      return await llmManager.streamResponse(model, request, options)
    },
    [llmManager],
  )

  return (
    <LLMContext.Provider
      value={{ generateResponse, streamResponse, chatModel, applyModel }}
    >
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
