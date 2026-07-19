import { CodexMessageAdapter } from './codexMessageAdapter'

const terminalEventTypes = [
  'response.completed',
  'response.incomplete',
] as const

describe.each(terminalEventTypes)('CodexMessageAdapter %s', (eventType) => {
  it('keeps output accumulated from stream events when the final response omits it', async () => {
    const createdResponse = {
      id: 'resp_1',
      object: 'response',
      created_at: 1,
      status: 'in_progress',
      model: 'gpt-test',
      output: [],
    }
    const finalResponse = {
      ...createdResponse,
      status: eventType === 'response.completed' ? 'completed' : 'incomplete',
      usage: {
        input_tokens: 10,
        output_tokens: 2,
        total_tokens: 12,
      },
    }
    const events = [
      { type: 'response.created', response: createdResponse },
      {
        type: 'response.output_item.added',
        output_index: 0,
        item: {
          id: 'msg_1',
          type: 'message',
          role: 'assistant',
          status: 'in_progress',
          content: [],
        },
      },
      {
        type: 'response.content_part.added',
        item_id: 'msg_1',
        output_index: 0,
        content_index: 0,
        part: {
          type: 'output_text',
          text: '',
          annotations: [],
          logprobs: [],
        },
      },
      {
        type: 'response.output_text.delta',
        item_id: 'msg_1',
        output_index: 0,
        content_index: 0,
        delta: 'updated note',
        logprobs: [],
      },
      { type: eventType, response: finalResponse },
    ]
    const body = events
      .map((event) => `data: ${JSON.stringify(event)}\n\n`)
      .join('')
    const fetchFn = jest.fn(async () => new Response(body)) as typeof fetch
    const adapter = new CodexMessageAdapter({ fetchFn })

    const result = await adapter.generateResponse({
      model: 'gpt-test',
      messages: [{ role: 'user', content: 'Update the note' }],
    })

    expect(result.choices[0].message.content).toBe('updated note')
    expect(result.usage).toEqual({
      prompt_tokens: 10,
      completion_tokens: 2,
      total_tokens: 12,
    })
  })

  it('uses final response output when the stream did not accumulate output', async () => {
    const createdResponse = {
      id: 'resp_1',
      object: 'response',
      created_at: 1,
      status: 'in_progress',
      model: 'gpt-test',
      output: [],
    }
    const finalResponse = {
      ...createdResponse,
      status: eventType === 'response.completed' ? 'completed' : 'incomplete',
      output: [
        {
          id: 'msg_1',
          type: 'message',
          role: 'assistant',
          status: 'completed',
          content: [
            {
              type: 'output_text',
              text: 'final output',
              annotations: [],
              logprobs: [],
            },
          ],
        },
      ],
    }
    const events = [
      { type: 'response.created', response: createdResponse },
      { type: eventType, response: finalResponse },
    ]
    const body = events
      .map((event) => `data: ${JSON.stringify(event)}\n\n`)
      .join('')
    const fetchFn = jest.fn(async () => new Response(body)) as typeof fetch
    const adapter = new CodexMessageAdapter({ fetchFn })

    const result = await adapter.generateResponse({
      model: 'gpt-test',
      messages: [{ role: 'user', content: 'Update the note' }],
    })

    expect(result.choices[0].message.content).toBe('final output')
  })
})
