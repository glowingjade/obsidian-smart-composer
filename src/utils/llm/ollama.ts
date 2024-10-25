import OpenAI from "openai";
import { FinalRequestOptions } from "openai/core";
import { LLMOptions, LLMRequestNonStreaming, LLMRequestStreaming } from "src/types/llm/request";
import { LLMResponseNonStreaming, LLMResponseStreaming } from "src/types/llm/response";

import { BaseLLMProvider } from './base'
import { OpenAIProvider } from "./openai";

export class NoStainlessOpenAI extends OpenAI {
    defaultHeaders() {
      return {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      };
    }
  
    buildRequest<Req>(
      options: FinalRequestOptions<Req>,
      { retryCount = 0 }: { retryCount?: number } = {},
    ): { req: RequestInit; url: string; timeout: number } {
      const req = super.buildRequest(options, { retryCount });
      req.req.headers = undefined;
      return req;
    }
  }

  export type OllamaModel =
  | 'llama3.1'
  | 'incept5/llama3.1-claude'
  export const OLLAMA_MODELS: OllamaModel[] = [
    'llama3.1', 
    'incept5/llama3.1-claude',
  ]

  export class OllamaAIOpenAIProvider implements BaseLLMProvider {
      private wrappedOpenAIProvider: OpenAIProvider;
    
    constructor() {
        this.wrappedOpenAIProvider = new OpenAIProvider('', new NoStainlessOpenAI({apiKey:'null', dangerouslyAllowBrowser: true, baseURL: 'http://127.0.0.1:11434/v1'}));
    }
      generateResponse(request: LLMRequestNonStreaming, options?: LLMOptions): Promise<LLMResponseNonStreaming> {
        return this.wrappedOpenAIProvider.generateResponse(request, options);
      }
      streamResponse(request: LLMRequestStreaming, options?: LLMOptions): Promise<AsyncIterable<LLMResponseStreaming>> {
          return this.wrappedOpenAIProvider.streamResponse(request, options);
      }
      getSupportedModels(): string[] {
          return OLLAMA_MODELS;
      }

  }