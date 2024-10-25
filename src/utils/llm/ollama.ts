import OpenAI from "openai";
import { FinalRequestOptions } from "openai/core";
import { LLMOptions, LLMRequestNonStreaming, LLMRequestStreaming } from "src/types/llm/request";
import { LLMResponseNonStreaming, LLMResponseStreaming } from "src/types/llm/response";

import { BaseLLMProvider } from './base'
import { OpenAIProvider } from "./openai";
import { LLMABaseUrlNotSetException } from "./exception";

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
    private ollamaBaseUrl: string;
    
    constructor(ollamaBaseUrl: string) {
      this.ollamaBaseUrl = ollamaBaseUrl;
        this.wrappedOpenAIProvider = new OpenAIProvider('', new NoStainlessOpenAI({apiKey:'null', dangerouslyAllowBrowser: true, baseURL: `${ollamaBaseUrl}/v1`}));
    }
      generateResponse(request: LLMRequestNonStreaming, options?: LLMOptions): Promise<LLMResponseNonStreaming> {
        if (!this.ollamaBaseUrl) {
          throw new LLMABaseUrlNotSetException(
            'Ollama Address is missing. Please set it in settings menu.',
          )
        }
        return this.wrappedOpenAIProvider.generateResponse(request, options);
      }
      streamResponse(request: LLMRequestStreaming, options?: LLMOptions): Promise<AsyncIterable<LLMResponseStreaming>> {
        if (!this.ollamaBaseUrl) {
          throw new LLMABaseUrlNotSetException(
            'Ollama Address is missing. Please set it in settings menu.',
          )
        }
        return this.wrappedOpenAIProvider.streamResponse(request, options);
      }
      getSupportedModels(): string[] {
          return OLLAMA_MODELS;
      }

  }