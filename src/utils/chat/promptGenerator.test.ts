import { App } from 'obsidian'

import { ChatSettings } from '../../database/json/chat/types'
import { SmartComposerSettings } from '../../settings/schema/setting.types'

import { PromptGenerator } from './promptGenerator'

const mockApp = {} as unknown as App
const mockGetRagEngine = jest.fn()

function createSettings(
  overrides: Partial<SmartComposerSettings> = {},
): SmartComposerSettings {
  return {
    systemPrompt: '',
    chatModels: [],
    chatModelId: 'test',
    ...overrides,
  } as SmartComposerSettings
}

describe('PromptGenerator', () => {
  describe('getCustomInstructionMessage', () => {
    it('should return null when both global and per-chat prompts are empty', () => {
      const pg = new PromptGenerator(
        mockGetRagEngine,
        mockApp,
        createSettings({ systemPrompt: '' }),
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (pg as any).getCustomInstructionMessage(undefined)
      expect(result).toBeNull()
    })

    it('should return global prompt when no per-chat settings', () => {
      const pg = new PromptGenerator(
        mockGetRagEngine,
        mockApp,
        createSettings({ systemPrompt: 'Be concise' }),
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (pg as any).getCustomInstructionMessage(undefined)
      expect(result).not.toBeNull()
      expect(result.role).toBe('user')
      expect(result.content).toContain('Be concise')
      expect(result.content).toContain('<custom_instructions>')
    })

    it('should return per-chat prompt only when no global prompt (append mode)', () => {
      const pg = new PromptGenerator(
        mockGetRagEngine,
        mockApp,
        createSettings({ systemPrompt: '' }),
      )
      const chatSettings: ChatSettings = {
        systemPrompt: 'Respond in Spanish',
        systemPromptMode: 'append',
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (pg as any).getCustomInstructionMessage(chatSettings)
      expect(result).not.toBeNull()
      expect(result.content).toContain('Respond in Spanish')
    })

    it('should combine global and per-chat prompts in append mode', () => {
      const pg = new PromptGenerator(
        mockGetRagEngine,
        mockApp,
        createSettings({ systemPrompt: 'Be concise' }),
      )
      const chatSettings: ChatSettings = {
        systemPrompt: 'Respond in Spanish',
        systemPromptMode: 'append',
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (pg as any).getCustomInstructionMessage(chatSettings)
      expect(result).not.toBeNull()
      expect(result.content).toContain('Be concise')
      expect(result.content).toContain('Respond in Spanish')
      // Verify they are joined with double newline
      expect(result.content).toContain('Be concise\n\nRespond in Spanish')
    })

    it('should use only per-chat prompt in override mode', () => {
      const pg = new PromptGenerator(
        mockGetRagEngine,
        mockApp,
        createSettings({ systemPrompt: 'Be concise' }),
      )
      const chatSettings: ChatSettings = {
        systemPrompt: 'Respond in Spanish',
        systemPromptMode: 'override',
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (pg as any).getCustomInstructionMessage(chatSettings)
      expect(result).not.toBeNull()
      expect(result.content).toContain('Respond in Spanish')
      expect(result.content).not.toContain('Be concise')
    })

    it('should fall back to global prompt when override mode has empty per-chat prompt', () => {
      const pg = new PromptGenerator(
        mockGetRagEngine,
        mockApp,
        createSettings({ systemPrompt: 'Be concise' }),
      )
      const chatSettings: ChatSettings = {
        systemPrompt: '',
        systemPromptMode: 'override',
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (pg as any).getCustomInstructionMessage(chatSettings)
      expect(result).not.toBeNull()
      expect(result.content).toContain('Be concise')
    })

    it('should treat whitespace-only prompts as empty', () => {
      const pg = new PromptGenerator(
        mockGetRagEngine,
        mockApp,
        createSettings({ systemPrompt: '   ' }),
      )
      const chatSettings: ChatSettings = {
        systemPrompt: '  \n  ',
        systemPromptMode: 'append',
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (pg as any).getCustomInstructionMessage(chatSettings)
      expect(result).toBeNull()
    })

    it('should return null when override mode with empty per-chat and empty global', () => {
      const pg = new PromptGenerator(
        mockGetRagEngine,
        mockApp,
        createSettings({ systemPrompt: '' }),
      )
      const chatSettings: ChatSettings = {
        systemPrompt: '',
        systemPromptMode: 'override',
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (pg as any).getCustomInstructionMessage(chatSettings)
      expect(result).toBeNull()
    })
  })
})
