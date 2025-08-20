import { requestUrl } from 'obsidian'
import { ChatModel } from '../../types/chat-model.types'
import {
  LLMOptions,
  LLMRequestNonStreaming,
  LLMRequestStreaming,
} from '../../types/llm/request'
import {
  LLMResponseNonStreaming,
  LLMResponseStreaming,
} from '../../types/llm/response'
import { LLMProvider } from '../../types/provider.types'

import { BaseLLMProvider } from './base'
import {
  LLMAPIKeyInvalidException,
  LLMAPIKeyNotSetException,
} from './exception'

export class CopilotProvider extends BaseLLMProvider<Extract<LLMProvider, { type: 'copilot' }>> {
  private apiKey: string

  constructor(provider: Extract<LLMProvider, { type: 'copilot' }>) {
    super(provider)
    this.apiKey = provider.apiKey ?? ''
  }

  private async getCopilotToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000)
    const getSession = () => {
      const raw = window?.localStorage?.getItem?.('copilot.session')
      return raw ? JSON.parse(raw) : { token: null, exp: null }
    }
    const isValid = (token: string | null, exp: number | null) => token && exp && exp > now + 1000
    const { token: cachedToken, exp: cachedExp } = getSession()
    if (isValid(cachedToken, cachedExp)) return cachedToken

    if (!this.apiKey) throw new LLMAPIKeyNotSetException('Copilot API key (GitHub token) is not set.')
    let headers: Record<string, string> = {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `token ${this.apiKey}`,
    }
    const resp = await requestUrl({url: 'https://api.github.com/copilot_internal/v2/token',method: 'GET',headers,})
    if (resp.status === 401 || resp.status === 403) throw new LLMAPIKeyInvalidException('Invalid token')
    const data = await resp.json
    const newToken = data.token ?? data.access_token ?? undefined
    const newExp = (data.exp && Number.isFinite(data.exp)) ? data.exp : now + 3600
    if (!newToken) throw new Error('Failed to obtain Copilot session token from GitHub')
    window?.localStorage?.setItem?.('copilot.session', JSON.stringify({ token: newToken, exp: newExp }))
    return newToken
  }

  private getHeaders(sessionToken: string): Record<string, string> {
    return {
      accept: 'application/json',
      'editor-version': 'vscode/1.97.2',
      'editor-plugin-version': 'copilot.vim/1.16.0',
      'content-type': 'application/json',
      'user-agent': 'GithubCopilot/1.155.0',
      'accept-encoding': 'gzip,deflate,br',
      authorization: `Bearer ${sessionToken}`,
    }
  }

  async generateResponse(
    model: ChatModel,
    request: LLMRequestNonStreaming,
    options?: LLMOptions,
  ): Promise<LLMResponseNonStreaming> {
    if (model.providerType !== 'copilot') {
      throw new Error('Model is not a Copilot model')
    }
    let sessionToken = await this.getCopilotToken();
    const payload: Record<string, unknown> = {
      model: request.model,
      messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: request.temperature,
      top_p: request.top_p,
      stream: false,
    };
    let headers = this.getHeaders(sessionToken);
    headers['copilot-vision-request'] = 'true';
    let resp = await requestUrl({url: 'https://api.githubcopilot.com/chat/completions',method: 'POST',headers,body: JSON.stringify(payload)});
    if (resp.status === 401) {
      window?.localStorage?.removeItem?.('copilot.session');
      sessionToken = await this.getCopilotToken();
      headers.authorization = `Bearer ${sessionToken}`
      resp = await requestUrl({url: 'https://api.githubcopilot.com/chat/completions',method: 'POST',headers,body: JSON.stringify(payload)});
    }
    if (resp.status === 401 || resp.status === 403) {
      window?.localStorage?.removeItem?.('copilot.session');
      throw new Error('Invalid token')
    }
    if (!(resp.status >= 200 && resp.status < 300)) {
      throw new Error(`Copilot API error: HTTP ${resp.status} - ${resp.text}`)
    }
    
    let data: any;
    try {
      data = JSON.parse(resp.text);
    } catch (e) {
      throw new Error(`Copilot returned non-JSON response (HTTP ${resp.status}): ${resp.text}`);
    }
    const choices = (data.choices ?? data.results ?? []).map((c: any) => ({
      finish_reason: c.finish_reason ?? null,
      message: { content: c.message?.content ?? c.message ?? c.output ?? null, role: c.message?.role ?? 'assistant' },
    }));
    return {
      id: data.id ?? '',
      choices,
      created: data.created ?? undefined,
      model: data.model ?? model.model,
      object: 'chat.completion',
      system_fingerprint: data.system_fingerprint,
      usage: data.usage,
    };
  }

  async streamResponse(
    model: ChatModel,
    request: LLMRequestStreaming,
    options?: LLMOptions,
  ): Promise<AsyncIterable<LLMResponseStreaming>> {
    if (model.providerType !== 'copilot') {
      throw new Error('Model is not a Copilot model');
    }
    // Convert request to non-streaming
    const nonStreamingRequest: LLMRequestNonStreaming = {...request,stream: false};
    const response = await this.generateResponse(model, nonStreamingRequest, options);
    async function* streamGenerator(): AsyncIterable<LLMResponseStreaming> {
      for (const choice of response.choices) {
        yield {
          id: response.id ?? '',
          model: response.model ?? model.model,
          choices: [
            {
              finish_reason: choice.finish_reason ?? null,
              delta: {
                content: choice.message?.content ?? '',
                role: choice.message?.role ?? 'assistant',
              },
            },
          ],
          object: 'chat.completion.chunk',
          usage: response.usage,
        } as LLMResponseStreaming;
      }
    }
    return streamGenerator();
  }

  async getEmbedding(_model: string, _text: string): Promise<number[]> {
    throw new Error(
      `Provider copilot does not support embeddings. Please use a different provider.`,
    )
  }
}

export default CopilotProvider
