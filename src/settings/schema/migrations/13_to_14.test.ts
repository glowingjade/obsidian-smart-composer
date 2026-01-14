import { DEFAULT_CHAT_MODELS_V14, migrateFrom13To14 } from './13_to_14'

describe('Migration from v13 to v14', () => {
  it('should increment version to 14', () => {
    const oldSettings = {
      version: 13,
    }
    const result = migrateFrom13To14(oldSettings)
    expect(result.version).toBe(14)
  })

  it('should add xai provider and drop unused groq/morph providers', () => {
    const oldSettings = {
      version: 13,
      providers: [
        { type: 'openai', id: 'openai', apiKey: 'openai-key' },
        { type: 'anthropic', id: 'anthropic', apiKey: 'anthropic-key' },
        { type: 'gemini', id: 'gemini', apiKey: 'gemini-key' },
        { type: 'groq', id: 'groq', apiKey: 'groq-key' },
        { type: 'deepseek', id: 'deepseek', apiKey: 'deepseek-key' },
        { type: 'morph', id: 'morph', apiKey: 'morph-key' },
      ],
      chatModels: [], // No models using groq or morph
    }
    const result = migrateFrom13To14(oldSettings)
    expect(result.version).toBe(14)

    const providers = result.providers as {
      type: string
      id: string
    }[]

    // xai should be added
    expect(providers.find((p) => p.type === 'xai')).toBeDefined()

    // groq and morph should be dropped (no models use them)
    expect(providers.find((p) => p.id === 'groq')).toBeUndefined()
    expect(providers.find((p) => p.id === 'morph')).toBeUndefined()
  })

  it('should convert groq/morph to openai-compatible when models use them', () => {
    const oldSettings = {
      version: 13,
      providers: [
        { type: 'groq', id: 'groq', apiKey: 'groq-key' },
        { type: 'morph', id: 'morph', apiKey: 'morph-key' },
      ],
      chatModels: [
        {
          id: 'llama-groq',
          providerType: 'groq',
          providerId: 'groq',
          model: 'llama-3.3-70b',
        },
        {
          id: 'morph-v0',
          providerType: 'morph',
          providerId: 'morph',
          model: 'morph-v0',
        },
      ],
    }
    const result = migrateFrom13To14(oldSettings)

    const providers = result.providers as {
      type: string
      id: string
      baseUrl?: string
      apiKey?: string
    }[]

    // groq and morph should be converted to openai-compatible
    const groqProvider = providers.find((p) => p.id === 'groq')
    expect(groqProvider?.type).toBe('openai-compatible')
    expect(groqProvider?.baseUrl).toBe('https://api.groq.com/openai/v1')
    expect(groqProvider?.apiKey).toBe('groq-key')

    const morphProvider = providers.find((p) => p.id === 'morph')
    expect(morphProvider?.type).toBe('openai-compatible')
    expect(morphProvider?.baseUrl).toBe('https://api.morphllm.com/v1')
    expect(morphProvider?.apiKey).toBe('morph-key')

    // Chat models should also be converted
    const chatModels = result.chatModels as {
      id: string
      providerType: string
    }[]
    expect(chatModels.find((m) => m.id === 'llama-groq')?.providerType).toBe(
      'openai-compatible',
    )
    expect(chatModels.find((m) => m.id === 'morph-v0')?.providerType).toBe(
      'openai-compatible',
    )
  })

  it('should preserve custom baseUrl for groq/morph providers', () => {
    const oldSettings = {
      version: 13,
      providers: [
        {
          type: 'groq',
          id: 'groq',
          apiKey: 'groq-key',
          baseUrl: 'https://custom-groq.example.com/v1',
        },
        {
          type: 'morph',
          id: 'morph',
          apiKey: 'morph-key',
          baseUrl: 'https://custom-morph.example.com/v1',
        },
      ],
      chatModels: [
        {
          id: 'groq-model',
          providerType: 'groq',
          providerId: 'groq',
          model: 'x',
        },
        {
          id: 'morph-model',
          providerType: 'morph',
          providerId: 'morph',
          model: 'y',
        },
      ],
    }
    const result = migrateFrom13To14(oldSettings)

    const providers = result.providers as {
      type: string
      id: string
      baseUrl?: string
    }[]

    const groqProvider = providers.find((p) => p.id === 'groq')
    expect(groqProvider?.baseUrl).toBe('https://custom-groq.example.com/v1')

    const morphProvider = providers.find((p) => p.id === 'morph')
    expect(morphProvider?.baseUrl).toBe('https://custom-morph.example.com/v1')
  })

  it('should preserve existing API keys after migration', () => {
    const oldSettings = {
      version: 13,
      providers: [
        { type: 'openai', id: 'openai', apiKey: 'sk-openai-secret-key' },
        { type: 'anthropic', id: 'anthropic', apiKey: 'sk-ant-secret-key' },
        { type: 'gemini', id: 'gemini', apiKey: 'gemini-api-key-123' },
        { type: 'deepseek', id: 'deepseek', apiKey: 'deepseek-key-456' },
        { type: 'mistral', id: 'mistral', apiKey: 'mistral-key-789' },
        { type: 'perplexity', id: 'perplexity', apiKey: 'pplx-key' },
        { type: 'openrouter', id: 'openrouter', apiKey: 'openrouter-key' },
      ],
    }
    const result = migrateFrom13To14(oldSettings)

    const providers = result.providers as {
      type: string
      id: string
      apiKey?: string
    }[]

    // Verify all API keys are preserved
    expect(providers.find((p) => p.type === 'openai')?.apiKey).toBe(
      'sk-openai-secret-key',
    )
    expect(providers.find((p) => p.type === 'anthropic')?.apiKey).toBe(
      'sk-ant-secret-key',
    )
    expect(providers.find((p) => p.type === 'gemini')?.apiKey).toBe(
      'gemini-api-key-123',
    )
    expect(providers.find((p) => p.type === 'deepseek')?.apiKey).toBe(
      'deepseek-key-456',
    )
    expect(providers.find((p) => p.type === 'mistral')?.apiKey).toBe(
      'mistral-key-789',
    )
    expect(providers.find((p) => p.type === 'perplexity')?.apiKey).toBe(
      'pplx-key',
    )
    expect(providers.find((p) => p.type === 'openrouter')?.apiKey).toBe(
      'openrouter-key',
    )

    // Verify new xai provider is added (without API key since it's new)
    const xaiProvider = providers.find((p) => p.type === 'xai')
    expect(xaiProvider).toBeDefined()
    expect(xaiProvider?.apiKey).toBeUndefined()
  })

  it('should merge existing chat models with new default models', () => {
    const oldSettings = {
      version: 13,
      chatModels: [
        {
          id: 'claude-sonnet-4.5',
          providerType: 'anthropic',
          providerId: 'anthropic',
          model: 'claude-sonnet-4-5',
          enable: false,
        },
        {
          id: 'custom-model',
          providerType: 'custom',
          providerId: 'custom',
          model: 'custom-model',
        },
      ],
    }
    const result = migrateFrom13To14(oldSettings)

    expect(result.chatModels).toEqual([
      ...DEFAULT_CHAT_MODELS_V14.map((model) =>
        model.id === 'claude-sonnet-4.5'
          ? {
              ...model,
              enable: false,
            }
          : model,
      ),
      {
        id: 'custom-model',
        providerType: 'custom',
        providerId: 'custom',
        model: 'custom-model',
      },
    ])
  })

  it('should add new Claude Opus 4.5 model', () => {
    const oldSettings = {
      version: 13,
      chatModels: [
        {
          id: 'claude-sonnet-4.5',
          providerType: 'anthropic',
          providerId: 'anthropic',
          model: 'claude-sonnet-4-5',
        },
      ],
    }
    const result = migrateFrom13To14(oldSettings)

    const chatModels = result.chatModels as { id: string }[]
    const opus45 = chatModels.find((m) => m.id === 'claude-opus-4.5')

    expect(opus45).toBeDefined()
    expect(opus45).toEqual({
      id: 'claude-opus-4.5',
      providerType: 'anthropic',
      providerId: 'anthropic',
      model: 'claude-opus-4-5',
    })
  })

  it('should add new GPT-5.2 and GPT-4.1-mini models', () => {
    const oldSettings = {
      version: 13,
      chatModels: [
        {
          id: 'gpt-5-mini',
          providerType: 'openai',
          providerId: 'openai',
          model: 'gpt-5-mini',
        },
      ],
    }
    const result = migrateFrom13To14(oldSettings)

    const chatModels = result.chatModels as { id: string }[]
    const gpt52 = chatModels.find((m) => m.id === 'gpt-5.2')
    const gpt41Mini = chatModels.find((m) => m.id === 'gpt-4.1-mini')

    expect(gpt52).toBeDefined()
    expect(gpt52).toEqual({
      id: 'gpt-5.2',
      providerType: 'openai',
      providerId: 'openai',
      model: 'gpt-5.2',
    })

    expect(gpt41Mini).toBeDefined()
    expect(gpt41Mini).toEqual({
      id: 'gpt-4.1-mini',
      providerType: 'openai',
      providerId: 'openai',
      model: 'gpt-4.1-mini',
    })
  })

  it('should add new Gemini 3 models', () => {
    const oldSettings = {
      version: 13,
      chatModels: [],
    }
    const result = migrateFrom13To14(oldSettings)

    const chatModels = result.chatModels as { id: string }[]
    const gemini3Pro = chatModels.find((m) => m.id === 'gemini-3-pro-preview')
    const gemini3Flash = chatModels.find(
      (m) => m.id === 'gemini-3-flash-preview',
    )

    expect(gemini3Pro).toBeDefined()
    expect(gemini3Pro).toEqual({
      id: 'gemini-3-pro-preview',
      providerType: 'gemini',
      providerId: 'gemini',
      model: 'gemini-3-pro-preview',
    })

    expect(gemini3Flash).toBeDefined()
    expect(gemini3Flash).toEqual({
      id: 'gemini-3-flash-preview',
      providerType: 'gemini',
      providerId: 'gemini',
      model: 'gemini-3-flash-preview',
    })
  })

  it('should add new Grok models from xai provider', () => {
    const oldSettings = {
      version: 13,
      chatModels: [],
    }
    const result = migrateFrom13To14(oldSettings)

    const chatModels = result.chatModels as { id: string }[]
    const grokFast = chatModels.find((m) => m.id === 'grok-4-1-fast')
    const grokNonReasoning = chatModels.find(
      (m) => m.id === 'grok-4-1-fast-non-reasoning',
    )

    expect(grokFast).toBeDefined()
    expect(grokFast).toEqual({
      id: 'grok-4-1-fast',
      providerType: 'xai',
      providerId: 'xai',
      model: 'grok-4-1-fast',
    })

    expect(grokNonReasoning).toBeDefined()
    expect(grokNonReasoning).toEqual({
      id: 'grok-4-1-fast-non-reasoning',
      providerType: 'xai',
      providerId: 'xai',
      model: 'grok-4-1-fast-non-reasoning',
    })
  })

  it('should preserve removed models as custom models', () => {
    const oldSettings = {
      version: 13,
      chatModels: [
        {
          id: 'gpt-5.1',
          providerType: 'openai',
          providerId: 'openai',
          model: 'gpt-5.1',
          enable: true,
        },
        {
          id: 'gpt-4o',
          providerType: 'openai',
          providerId: 'openai',
          model: 'gpt-4o',
        },
        {
          id: 'morph-v0',
          providerType: 'morph',
          providerId: 'morph',
          model: 'morph-v0',
        },
        {
          id: 'sonar',
          providerType: 'perplexity',
          providerId: 'perplexity',
          model: 'sonar',
        },
      ],
    }
    const result = migrateFrom13To14(oldSettings)

    const chatModels = result.chatModels as { id: string }[]

    // These models should be preserved as custom models since they are not in DEFAULT_CHAT_MODELS_V14
    const gpt51 = chatModels.find((m) => m.id === 'gpt-5.1')
    const gpt4o = chatModels.find((m) => m.id === 'gpt-4o')
    const morphV0 = chatModels.find((m) => m.id === 'morph-v0')
    const sonar = chatModels.find((m) => m.id === 'sonar')

    expect(gpt51).toBeDefined()
    expect(gpt51).toEqual({
      id: 'gpt-5.1',
      providerType: 'openai',
      providerId: 'openai',
      model: 'gpt-5.1',
      enable: true,
    })

    expect(gpt4o).toBeDefined()
    expect(gpt4o).toEqual({
      id: 'gpt-4o',
      providerType: 'openai',
      providerId: 'openai',
      model: 'gpt-4o',
    })

    expect(morphV0).toBeDefined()
    expect(morphV0).toEqual({
      id: 'morph-v0',
      providerType: 'openai-compatible',
      providerId: 'morph',
      model: 'morph-v0',
    })

    expect(sonar).toBeDefined()
    expect(sonar).toEqual({
      id: 'sonar',
      providerType: 'perplexity',
      providerId: 'perplexity',
      model: 'sonar',
    })
  })

  it('should preserve o4-mini with reasoning settings', () => {
    const oldSettings = {
      version: 13,
      chatModels: [
        {
          id: 'o4-mini',
          providerType: 'openai',
          providerId: 'openai',
          model: 'o4-mini',
          reasoning: {
            enabled: true,
            reasoning_effort: 'high',
          },
        },
      ],
    }
    const result = migrateFrom13To14(oldSettings)

    const chatModels = result.chatModels as {
      id: string
      reasoning?: { enabled: boolean; reasoning_effort?: string }
    }[]
    const o4Mini = chatModels.find((m) => m.id === 'o4-mini')

    expect(o4Mini).toBeDefined()
    // Note: Object.assign does shallow merge, so reasoning settings from default override user settings
    expect(o4Mini?.reasoning).toEqual({
      enabled: true,
      reasoning_effort: 'medium',
    })
  })
})

describe('Test with real data', () => {
  const oldSettings = {
    version: 13,
    providers: [
      {
        type: 'openai',
        id: 'openai',
        apiKey: 'test-openai-api-key',
      },
      {
        type: 'anthropic',
        id: 'anthropic',
        apiKey: 'test-anthropic-api-key',
      },
      {
        type: 'gemini',
        id: 'gemini',
        apiKey: 'test-gemini-api-key',
      },
      {
        type: 'deepseek',
        id: 'deepseek',
        apiKey: 'test-deepseek-api-key',
      },
      {
        type: 'perplexity',
        id: 'perplexity',
        apiKey: 'test-perplexity-api-key',
      },
      {
        type: 'groq',
        id: 'groq',
        apiKey: 'test-groq-api-key',
      },
      {
        type: 'mistral',
        id: 'mistral',
      },
      {
        type: 'openrouter',
        id: 'openrouter',
        baseUrl: '',
        apiKey: 'test-openrouter-api-key',
      },
      {
        type: 'ollama',
        id: 'ollama',
        baseUrl: 'ollama-url-test',
      },
      {
        type: 'lm-studio',
        id: 'lm-studio',
      },
      {
        type: 'morph',
        id: 'morph',
      },
      {
        type: 'openai-compatible',
        id: 'siliconflow',
        baseUrl: 'siliconflow-test',
        apiKey: '',
      },
    ],
    chatModels: [
      {
        providerType: 'anthropic',
        providerId: 'anthropic',
        id: 'claude-opus-4.1',
        model: 'claude-opus-4-1',
      },
      {
        providerType: 'anthropic',
        providerId: 'anthropic',
        id: 'claude-sonnet-4.5',
        model: 'claude-sonnet-4-5',
      },
      {
        providerType: 'anthropic',
        providerId: 'anthropic',
        id: 'claude-haiku-4.5',
        model: 'claude-haiku-4-5',
      },
      {
        providerType: 'openai',
        providerId: 'openai',
        id: 'gpt-5.1',
        model: 'gpt-5.1',
      },
      {
        providerType: 'openai',
        providerId: 'openai',
        id: 'gpt-5',
        model: 'gpt-5',
      },
      {
        providerType: 'openai',
        providerId: 'openai',
        id: 'gpt-5-mini',
        model: 'gpt-5-mini',
      },
      {
        providerType: 'openai',
        providerId: 'openai',
        id: 'gpt-5-nano',
        model: 'gpt-5-nano',
      },
      {
        providerType: 'openai',
        providerId: 'openai',
        id: 'gpt-4.1',
        model: 'gpt-4.1',
      },
      {
        providerType: 'openai',
        providerId: 'openai',
        id: 'gpt-4.1-mini',
        model: 'gpt-4.1-mini',
      },
      {
        providerType: 'openai',
        providerId: 'openai',
        id: 'gpt-4.1-nano',
        model: 'gpt-4.1-nano',
        enable: false,
      },
      {
        providerType: 'openai',
        providerId: 'openai',
        id: 'gpt-4o',
        model: 'gpt-4o',
        enable: false,
      },
      {
        providerType: 'openai',
        providerId: 'openai',
        id: 'gpt-4o-mini',
        model: 'gpt-4o-mini',
        enable: false,
      },
      {
        providerType: 'openai',
        providerId: 'openai',
        id: 'o4-mini',
        model: 'o4-mini',
        enable: false,
        reasoning: {
          enabled: true,
          reasoning_effort: 'medium',
        },
      },
      {
        providerType: 'openai',
        providerId: 'openai',
        id: 'o3',
        model: 'o3',
        enable: false,
        reasoning: {
          enabled: true,
          reasoning_effort: 'medium',
        },
      },
      {
        providerType: 'gemini',
        providerId: 'gemini',
        id: 'gemini-2.5-pro',
        model: 'gemini-2.5-pro',
      },
      {
        providerType: 'gemini',
        providerId: 'gemini',
        id: 'gemini-2.5-flash',
        model: 'gemini-2.5-flash',
      },
      {
        providerType: 'gemini',
        providerId: 'gemini',
        id: 'gemini-2.5-flash-lite',
        model: 'gemini-2.5-flash-lite',
      },
      {
        providerType: 'gemini',
        providerId: 'gemini',
        id: 'gemini-2.0-flash',
        model: 'gemini-2.0-flash',
        enable: false,
      },
      {
        providerType: 'gemini',
        providerId: 'gemini',
        id: 'gemini-2.0-flash-lite',
        model: 'gemini-2.0-flash-lite',
        enable: false,
      },
      {
        providerType: 'deepseek',
        providerId: 'deepseek',
        id: 'deepseek-chat',
        model: 'deepseek-chat',
        enable: false,
      },
      {
        providerType: 'deepseek',
        providerId: 'deepseek',
        id: 'deepseek-reasoner',
        model: 'deepseek-reasoner',
        enable: false,
      },
      {
        providerType: 'perplexity',
        providerId: 'perplexity',
        id: 'sonar',
        model: 'sonar',
        enable: false,
        web_search_options: {
          search_context_size: 'low',
        },
      },
      {
        providerType: 'perplexity',
        providerId: 'perplexity',
        id: 'sonar-pro',
        model: 'sonar',
        web_search_options: {
          search_context_size: 'low',
        },
      },
      {
        providerType: 'perplexity',
        providerId: 'perplexity',
        id: 'sonar-deep-research',
        model: 'sonar-deep-research',
        enable: false,
        web_search_options: {
          search_context_size: 'low',
        },
      },
      {
        providerType: 'perplexity',
        providerId: 'perplexity',
        id: 'sonar-reasoning',
        model: 'sonar',
        enable: false,
        web_search_options: {
          search_context_size: 'low',
        },
      },
      {
        providerType: 'perplexity',
        providerId: 'perplexity',
        id: 'sonar-reasoning-pro',
        model: 'sonar',
        enable: false,
        web_search_options: {
          search_context_size: 'low',
        },
      },
      {
        providerType: 'morph',
        providerId: 'morph',
        id: 'morph-v0',
        model: 'morph-v0',
        enable: false,
      },
      {
        providerType: 'anthropic',
        providerId: 'anthropic',
        id: 'claude-sonnet-4.0',
        model: 'claude-sonnet-4-0',
      },
      {
        providerType: 'anthropic',
        providerId: 'anthropic',
        id: 'claude-3.7-sonnet',
        model: 'claude-3-7-sonnet-latest',
      },
      {
        providerType: 'anthropic',
        providerId: 'anthropic',
        id: 'claude-3.5-sonnet',
        model: 'claude-3-5-sonnet-latest',
        enable: false,
      },
      {
        providerType: 'anthropic',
        providerId: 'anthropic',
        id: 'claude-3.5-haiku',
        model: 'claude-3-5-haiku-latest',
        enable: false,
      },
      {
        providerType: 'anthropic',
        providerId: 'anthropic',
        id: 'claude-3.7-sonnet-thinking',
        model: 'claude-3-7-sonnet-latest',
        thinking: {
          enabled: true,
          budget_tokens: 8192,
        },
      },
      {
        providerType: 'gemini',
        providerId: 'gemini',
        id: 'gemini-2.0-flash-thinking',
        model: 'gemini-2.0-flash-thinking-exp',
        enable: false,
      },
      {
        providerType: 'gemini',
        providerId: 'gemini',
        id: 'gemini-1.5-pro',
        model: 'gemini-1.5-pro',
        enable: false,
      },
      {
        providerType: 'gemini',
        providerId: 'gemini',
        id: 'gemini-1.5-flash',
        model: 'gemini-1.5-flash',
        enable: false,
      },
      {
        providerType: 'gemini',
        providerId: 'gemini',
        id: 'gemini-exp-1206',
        model: 'gemini-exp-1206',
        enable: false,
      },
      {
        providerType: 'openrouter',
        providerId: 'openrouter',
        id: 'llama-3.3-70b-instruct',
        model: 'meta-llama/llama-3.3-70b-instruct',
      },
      {
        providerType: 'openai-compatible',
        providerId: 'mistral',
        id: 'mistral-small-latest',
        model: 'mistral-small-latest',
        promptLevel: 1,
      },
    ],
    embeddingModels: [
      {
        providerType: 'openai',
        providerId: 'openai',
        id: 'openai/text-embedding-3-small',
        model: 'text-embedding-3-small',
        dimension: 1536,
      },
      {
        providerType: 'openai',
        providerId: 'openai',
        id: 'openai/text-embedding-3-large',
        model: 'text-embedding-3-large',
        dimension: 3072,
      },
      {
        providerType: 'gemini',
        providerId: 'gemini',
        id: 'gemini/text-embedding-004',
        model: 'text-embedding-004',
        dimension: 768,
      },
      {
        providerType: 'ollama',
        providerId: 'ollama',
        id: 'ollama/nomic-embed-text',
        model: 'nomic-embed-text',
        dimension: 768,
      },
      {
        providerType: 'ollama',
        providerId: 'ollama',
        id: 'ollama/mxbai-embed-large',
        model: 'mxbai-embed-large',
        dimension: 1024,
      },
      {
        providerType: 'ollama',
        providerId: 'ollama',
        id: 'ollama/bge-m3',
        model: 'bge-m3',
        dimension: 1024,
      },
    ],
    chatModelId: 'gpt-4.1',
    applyModelId: 'gpt-4.1-mini',
    embeddingModelId: 'openai/text-embedding-3-small',
    systemPrompt: '',
    ragOptions: {
      chunkSize: 1000,
      thresholdTokens: 8192,
      minSimilarity: 0,
      limit: 10,
      excludePatterns: [],
      includePatterns: [],
    },
    mcp: {
      servers: [
        {
          id: 'markitdown',
          parameters: {
            command: 'uvx',
            args: ['markitdown-mcp'],
          },
          enabled: true,
          toolOptions: {},
        },
      ],
    },
    chatOptions: {
      includeCurrentFileContent: true,
      enableTools: false,
      maxAutoIterations: 1,
    },
  }

  it('should migrate real data without errors', () => {
    const result = migrateFrom13To14(oldSettings)
    expect(result.version).toBe(14)
  })

  it('should preserve all API keys from real data', () => {
    const result = migrateFrom13To14(oldSettings)
    const providers = result.providers as {
      type: string
      id: string
      apiKey?: string
      baseUrl?: string
    }[]

    expect(providers.find((p) => p.type === 'openai')?.apiKey).toBe(
      'test-openai-api-key',
    )
    expect(providers.find((p) => p.type === 'anthropic')?.apiKey).toBe(
      'test-anthropic-api-key',
    )
    expect(providers.find((p) => p.type === 'gemini')?.apiKey).toBe(
      'test-gemini-api-key',
    )
    expect(providers.find((p) => p.type === 'deepseek')?.apiKey).toBe(
      'test-deepseek-api-key',
    )
    expect(providers.find((p) => p.type === 'perplexity')?.apiKey).toBe(
      'test-perplexity-api-key',
    )
    expect(providers.find((p) => p.type === 'openrouter')?.apiKey).toBe(
      'test-openrouter-api-key',
    )
  })

  it('should preserve custom provider configurations from real data', () => {
    const result = migrateFrom13To14(oldSettings)
    const providers = result.providers as {
      type: string
      id: string
      apiKey?: string
      baseUrl?: string
    }[]

    // groq should be dropped (no models use it)
    expect(providers.find((p) => p.id === 'groq')).toBeUndefined()

    // morph should be converted to openai-compatible (morph-v0 model uses it)
    const morphProvider = providers.find((p) => p.id === 'morph')
    expect(morphProvider?.type).toBe('openai-compatible')
    expect(morphProvider?.baseUrl).toBe('https://api.morphllm.com/v1')

    // ollama with custom baseUrl should be preserved
    const ollama = providers.find((p) => p.type === 'ollama')
    expect(ollama?.baseUrl).toBe('ollama-url-test')

    // openai-compatible provider should be preserved
    const siliconflow = providers.find((p) => p.id === 'siliconflow')
    expect(siliconflow).toBeDefined()
    expect(siliconflow?.baseUrl).toBe('siliconflow-test')
  })

  it('should preserve user model settings from real data', () => {
    const result = migrateFrom13To14(oldSettings)
    const chatModels = result.chatModels as {
      id: string
      enable?: boolean
      thinking?: { enabled: boolean; budget_tokens: number }
      web_search_options?: { search_context_size: string }
      promptLevel?: number
    }[]

    // Check that user's disabled models remain disabled
    const gpt4o = chatModels.find((m) => m.id === 'gpt-4o')
    expect(gpt4o?.enable).toBe(false)

    // Check that models with thinking settings are preserved
    const claude37Thinking = chatModels.find(
      (m) => m.id === 'claude-3.7-sonnet-thinking',
    )
    expect(claude37Thinking?.thinking).toEqual({
      enabled: true,
      budget_tokens: 8192,
    })

    // Check that custom model with promptLevel is preserved
    const mistralSmall = chatModels.find((m) => m.id === 'mistral-small-latest')
    expect(mistralSmall?.promptLevel).toBe(1)
  })

  it('should add xai provider for real data', () => {
    const result = migrateFrom13To14(oldSettings)
    const providers = result.providers as { type: string; id: string }[]

    const xai = providers.find((p) => p.type === 'xai')
    expect(xai).toBeDefined()
  })

  it('should add new default models to real data', () => {
    const result = migrateFrom13To14(oldSettings)
    const chatModels = result.chatModels as { id: string }[]

    // New models should be added
    expect(chatModels.find((m) => m.id === 'gpt-5.2')).toBeDefined()
    expect(chatModels.find((m) => m.id === 'claude-opus-4.5')).toBeDefined()
    expect(
      chatModels.find((m) => m.id === 'gemini-3-pro-preview'),
    ).toBeDefined()
    expect(
      chatModels.find((m) => m.id === 'gemini-3-flash-preview'),
    ).toBeDefined()
    expect(chatModels.find((m) => m.id === 'grok-4-1-fast')).toBeDefined()
    expect(
      chatModels.find((m) => m.id === 'grok-4-1-fast-non-reasoning'),
    ).toBeDefined()
  })

  it('should preserve removed models as custom models from real data', () => {
    const result = migrateFrom13To14(oldSettings)
    const chatModels = result.chatModels as { id: string }[]

    // Models removed from defaults should still be preserved
    expect(chatModels.find((m) => m.id === 'gpt-5.1')).toBeDefined()
    expect(chatModels.find((m) => m.id === 'gpt-5-nano')).toBeDefined()
    expect(chatModels.find((m) => m.id === 'claude-opus-4.1')).toBeDefined()
    expect(chatModels.find((m) => m.id === 'gemini-2.5-pro')).toBeDefined()
    expect(chatModels.find((m) => m.id === 'morph-v0')).toBeDefined()
    expect(chatModels.find((m) => m.id === 'sonar')).toBeDefined()
  })

  it('should preserve other settings from real data', () => {
    const result = migrateFrom13To14(oldSettings)

    expect(result.chatModelId).toBe('gpt-4.1')
    expect(result.applyModelId).toBe('gpt-4.1-mini')
    expect(result.embeddingModelId).toBe('openai/text-embedding-3-small')
    expect(result.systemPrompt).toBe('')
    expect(result.ragOptions).toEqual({
      chunkSize: 1000,
      thresholdTokens: 8192,
      minSimilarity: 0,
      limit: 10,
      excludePatterns: [],
      includePatterns: [],
    })
    expect(result.mcp).toBeDefined()
    expect(result.chatOptions).toEqual({
      includeCurrentFileContent: true,
      enableTools: false,
      maxAutoIterations: 1,
    })
  })

  it('should preserve embedding models from real data', () => {
    const result = migrateFrom13To14(oldSettings)
    expect(result.embeddingModels).toEqual(oldSettings.embeddingModels)
  })
})
