import { OpenAICompatibleProvider } from './openaiCompatibleProvider'

describe('OpenAICompatibleProvider.getEmbedding', () => {
  const provider = {
    type: 'openai-compatible' as const,
    id: 'voyage-compatible',
    baseUrl: 'https://api.voyageai.com/v1',
    apiKey: 'test-key',
  }

  it('retries without encoding_format when provider rejects it', async () => {
    const compatibleProvider = new OpenAICompatibleProvider(provider)
    const createMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('unknown field: encoding_format'))
      .mockResolvedValueOnce({
        data: [{ embedding: [0.1, 0.2, 0.3] }],
      })

    ;(compatibleProvider as unknown as { client: { embeddings: { create: typeof createMock } } }).client = {
      embeddings: {
        create: createMock,
      },
    }

    const result = await compatibleProvider.getEmbedding('voyage-4-large', 'test', {
      dimensions: 1024,
    })

    expect(result).toEqual([0.1, 0.2, 0.3])
    expect(createMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        model: 'voyage-4-large',
        input: 'test',
        encoding_format: 'float',
        dimensions: 1024,
      }),
    )
    expect(createMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        model: 'voyage-4-large',
        input: 'test',
        dimensions: 1024,
      }),
    )
  })

  it('retries with output_dimension for providers that use a different field name', async () => {
    const compatibleProvider = new OpenAICompatibleProvider(provider)
    const createMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('unknown field: encoding_format'))
      .mockRejectedValueOnce(new Error('unknown field: dimensions'))
      .mockResolvedValueOnce({
        data: [{ embedding: [0.1, 0.2] }],
      })

    ;(compatibleProvider as unknown as { client: { embeddings: { create: typeof createMock } } }).client = {
      embeddings: {
        create: createMock,
      },
    }

    const result = await compatibleProvider.getEmbedding('voyage-4-large', 'test', {
      dimensions: 512,
    })

    expect(result).toEqual([0.1, 0.2])
    expect(createMock).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        model: 'voyage-4-large',
        input: 'test',
        output_dimension: 512,
      }),
    )
  })
})
