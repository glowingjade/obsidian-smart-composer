import type {
  Content,
  GenerateContentConfig,
  GenerateContentResponse,
  ToolListUnion,
} from '@google/genai'

export type CodeAssistRequestPayload = {
  contents: Content[]
  systemInstruction?: Content
  tools?: ToolListUnion
  generationConfig?: GenerateContentConfig
}

export type CodeAssistGenerateContentRequest = {
  project: string
  model: string
  request: CodeAssistRequestPayload
}

export type CodeAssistGenerateContentResponse = {
  response: GenerateContentResponse
  traceId?: string
}
