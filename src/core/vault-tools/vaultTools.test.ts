import { App, TFile, TFolder } from 'obsidian'

import { ToolCallResponseStatus } from '../../types/tool-call.types'
import { VaultTools } from './vaultTools'

function makeFile(path: string, name: string, mtime = 0): TFile {
  const f = new (TFile as unknown as new () => TFile)()
  const extension = name.includes('.') ? name.split('.').pop()! : ''
  Object.assign(f, { path, name, extension, stat: { mtime, size: 0 } })
  return f
}

function makeFolder(path: string, children: (TFile | TFolder)[] = []): TFolder {
  const f = new (TFolder as unknown as new () => TFolder)()
  Object.assign(f, { path, name: path.split('/').pop() ?? path, children })
  return f
}

function makeApp(vaultOverrides: Record<string, unknown> = {}): App {
  return {
    vault: {
      getAbstractFileByPath: jest.fn(),
      getRoot: jest.fn(),
      getFiles: jest.fn().mockReturnValue([]),
      cachedRead: jest.fn().mockResolvedValue(''),
      ...vaultOverrides,
    },
  } as unknown as App
}

describe('VaultTools', () => {
  describe('isNativeTool', () => {
    it('returns true only for exact vault tool names', () => {
      const vt = new VaultTools(makeApp(), jest.fn())
      expect(vt.isNativeTool('vault_read_file')).toBe(true)
      expect(vt.isNativeTool('vault_list_directory')).toBe(true)
      expect(vt.isNativeTool('vault_search_files')).toBe(true)
      expect(vt.isNativeTool('vault_search_content')).toBe(true)
      expect(vt.isNativeTool('mcp__server__tool')).toBe(false)
      expect(vt.isNativeTool('vault__read_file')).toBe(false)
      expect(vt.isNativeTool('vault_unknown')).toBe(false)
    })
  })

  describe('listTools', () => {
    it('returns 4 tool definitions', () => {
      const vt = new VaultTools(makeApp(), jest.fn())
      expect(vt.listTools()).toHaveLength(4)
    })
  })

  describe('vault_read_file', () => {
    it('returns file content on success', async () => {
      const file = makeFile('notes/foo.md', 'foo.md')
      const app = makeApp({
        getAbstractFileByPath: jest.fn().mockReturnValue(file),
        cachedRead: jest.fn().mockResolvedValue('hello'),
      })
      const vt = new VaultTools(app, jest.fn())
      const result = await vt.callTool('vault_read_file', { path: 'notes/foo.md' })
      expect(result.status).toBe(ToolCallResponseStatus.Success)
      if (result.status === ToolCallResponseStatus.Success) {
        expect(result.data.text).toBe('hello')
      }
    })

    it('returns error when path not found', async () => {
      const app = makeApp({ getAbstractFileByPath: jest.fn().mockReturnValue(null) })
      const vt = new VaultTools(app, jest.fn())
      const result = await vt.callTool('vault_read_file', { path: 'missing.md' })
      expect(result.status).toBe(ToolCallResponseStatus.Error)
    })
  })

  describe('vault_list_directory', () => {
    it('lists root when no path given', async () => {
      const folder = makeFolder('/')
      const app = makeApp({ getRoot: jest.fn().mockReturnValue(folder) })
      const vt = new VaultTools(app, jest.fn())
      const result = await vt.callTool('vault_list_directory', {})
      expect(result.status).toBe(ToolCallResponseStatus.Success)
    })

    it('returns error when path resolves to a file', async () => {
      const file = makeFile('notes/foo.md', 'foo.md')
      const app = makeApp({ getAbstractFileByPath: jest.fn().mockReturnValue(file) })
      const vt = new VaultTools(app, jest.fn())
      const result = await vt.callTool('vault_list_directory', { path: 'notes/foo.md' })
      expect(result.status).toBe(ToolCallResponseStatus.Error)
    })

    it('paginates entries and reports has_more', async () => {
      const children = Array.from({ length: 10 }, (_, i) => makeFile(`notes/n${i}.md`, `n${i}.md`))
      const folder = makeFolder('notes', children)
      const app = makeApp({ getAbstractFileByPath: jest.fn().mockReturnValue(folder) })
      const vt = new VaultTools(app, jest.fn())
      const result = await vt.callTool('vault_list_directory', { path: 'notes', page: 0, page_size: 4 })
      expect(result.status).toBe(ToolCallResponseStatus.Success)
      if (result.status === ToolCallResponseStatus.Success) {
        const parsed = JSON.parse(result.data.text)
        expect(parsed.entries).toHaveLength(4)
        expect(parsed.has_more).toBe(true)
        expect(parsed.total).toBe(10)
      }
    })

    it('returns error for out-of-range page', async () => {
      const children = [makeFile('notes/a.md', 'a.md')]
      const folder = makeFolder('notes', children)
      const app = makeApp({ getAbstractFileByPath: jest.fn().mockReturnValue(folder) })
      const vt = new VaultTools(app, jest.fn())
      const result = await vt.callTool('vault_list_directory', { path: 'notes', page: 5, page_size: 10 })
      expect(result.status).toBe(ToolCallResponseStatus.Error)
    })

    it('lists folders before files', async () => {
      const sub = makeFolder('notes/sub')
      const file = makeFile('notes/a.md', 'a.md', 1000)
      const folder = makeFolder('notes', [file, sub])
      const app = makeApp({ getAbstractFileByPath: jest.fn().mockReturnValue(folder) })
      const vt = new VaultTools(app, jest.fn())
      const result = await vt.callTool('vault_list_directory', { path: 'notes' })
      expect(result.status).toBe(ToolCallResponseStatus.Success)
      if (result.status === ToolCallResponseStatus.Success) {
        const parsed = JSON.parse(result.data.text)
        expect(parsed.entries[0].type).toBe('folder')
        expect(parsed.entries[1].type).toBe('file')
      }
    })
  })

  describe('vault_search_files', () => {
    it('returns matching file paths', async () => {
      const files = [makeFile('notes/alpha.md', 'alpha.md'), makeFile('notes/beta.md', 'beta.md')]
      const app = makeApp({ getFiles: jest.fn().mockReturnValue(files) })
      const vt = new VaultTools(app, jest.fn())
      const result = await vt.callTool('vault_search_files', { query: 'alpha' })
      expect(result.status).toBe(ToolCallResponseStatus.Success)
      if (result.status === ToolCallResponseStatus.Success) {
        expect(result.data.text).toContain('notes/alpha.md')
        expect(result.data.text).not.toContain('notes/beta.md')
      }
    })

    it('matches case-insensitively', async () => {
      const files = [makeFile('notes/Python-guide.md', 'Python-guide.md')]
      const app = makeApp({ getFiles: jest.fn().mockReturnValue(files) })
      const vt = new VaultTools(app, jest.fn())
      const result = await vt.callTool('vault_search_files', { query: 'python' })
      expect(result.status).toBe(ToolCallResponseStatus.Success)
      if (result.status === ToolCallResponseStatus.Success) {
        expect(result.data.text).toContain('notes/Python-guide.md')
      }
    })

    it('truncates results beyond 50', async () => {
      const files = Array.from({ length: 60 }, (_, i) =>
        makeFile(`notes/note${i}.md`, `note${i}.md`),
      )
      const app = makeApp({ getFiles: jest.fn().mockReturnValue(files) })
      const vt = new VaultTools(app, jest.fn())
      const result = await vt.callTool('vault_search_files', { query: 'note' })
      expect(result.status).toBe(ToolCallResponseStatus.Success)
      if (result.status === ToolCallResponseStatus.Success) {
        const parsed = JSON.parse(result.data.text)
        expect(parsed.results).toHaveLength(50)
        expect(parsed.truncated).toBe(true)
      }
    })

    it('supports regex patterns', async () => {
      const files = [makeFile('Daily/2024-01-01.md', '2024-01-01.md'), makeFile('notes/alpha.md', 'alpha.md')]
      const app = makeApp({ getFiles: jest.fn().mockReturnValue(files) })
      const vt = new VaultTools(app, jest.fn())
      const result = await vt.callTool('vault_search_files', { query: '^Daily/.*\\.md$' })
      expect(result.status).toBe(ToolCallResponseStatus.Success)
      if (result.status === ToolCallResponseStatus.Success) {
        expect(result.data.text).toContain('Daily/2024-01-01.md')
        expect(result.data.text).not.toContain('notes/alpha.md')
      }
    })

    it('returns error for empty query', async () => {
      const vt = new VaultTools(makeApp(), jest.fn())
      const result = await vt.callTool('vault_search_files', { query: '' })
      expect(result.status).toBe(ToolCallResponseStatus.Error)
    })

    it.each([
      ['a[b', 'notes/a[b.md', 'a[b.md'],
      ['(a+)+b', 'notes/(a+)+b.md', '(a+)+b.md'],
      ['(a+){2}', 'notes/(a+){2}.md', '(a+){2}.md'],
    ])('falls back to literal match for %s', async (query, filePath, fileName) => {
      const files = [makeFile(filePath, fileName)]
      const app = makeApp({ getFiles: jest.fn().mockReturnValue(files) })
      const vt = new VaultTools(app, jest.fn())
      const result = await vt.callTool('vault_search_files', { query })
      expect(result.status).toBe(ToolCallResponseStatus.Success)
      if (result.status === ToolCallResponseStatus.Success) {
        expect(result.data.text).toContain(filePath)
      }
    })
  })

  describe('vault_search_content', () => {
    it('returns RAG results when available', async () => {
      const ragResults = [
        { path: 'notes/a.md', content: 'matched chunk text', similarity: 0.9, metadata: { startLine: 1, endLine: 5 } },
      ]
      const getRagEngine = jest.fn().mockResolvedValue({
        processQuery: jest.fn().mockResolvedValue(ragResults),
      })
      const vt = new VaultTools(makeApp(), getRagEngine)
      const result = await vt.callTool('vault_search_content', { query: 'foo' })
      expect(result.status).toBe(ToolCallResponseStatus.Success)
      if (result.status === ToolCallResponseStatus.Success) {
        expect(result.data.text).toContain('notes/a.md')
        expect(result.data.text).toContain('matched chunk text')
      }
    })

    it('filters by glob when provided', async () => {
      const files = [
        makeFile('daily/2024-01-01.md', '2024-01-01.md'),
        makeFile('projects/foo.md', 'foo.md'),
      ]
      const processQuery = jest.fn().mockResolvedValue([])
      const getRagEngine = jest.fn().mockResolvedValue({ processQuery })
      const app = makeApp({ getFiles: jest.fn().mockReturnValue(files) })
      const vt = new VaultTools(app, getRagEngine)
      await vt.callTool('vault_search_content', { query: 'test', glob: 'daily/**' })
      expect(processQuery).toHaveBeenCalledWith(
        expect.objectContaining({ scope: { files: ['daily/2024-01-01.md'], folders: [] } }),
      )
    })

    it('returns error when RAG fails', async () => {
      const getRagEngine = jest.fn().mockRejectedValue(new Error('no index'))
      const vt = new VaultTools(makeApp(), getRagEngine)
      const result = await vt.callTool('vault_search_content', { query: 'foo' })
      expect(result.status).toBe(ToolCallResponseStatus.Error)
      if (result.status === ToolCallResponseStatus.Error) {
        expect(result.error).toContain('no index')
      }
    })

    it('returns aborted when signal is already aborted', async () => {
      const getRagEngine = jest.fn().mockResolvedValue({
        processQuery: jest.fn().mockResolvedValue([]),
      })
      const vt = new VaultTools(makeApp(), getRagEngine)
      const controller = new AbortController()
      controller.abort()
      const result = await vt.callTool('vault_search_content', { query: 'foo' }, controller.signal)
      expect(result.status).toBe(ToolCallResponseStatus.Aborted)
    })

    it('returns aborted when signal fires during processQuery', async () => {
      const controller = new AbortController()
      const getRagEngine = jest.fn().mockResolvedValue({
        processQuery: jest.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(() => { controller.abort(); resolve([]) }, 0)),
        ),
      })
      const vt = new VaultTools(makeApp(), getRagEngine)
      const result = await vt.callTool('vault_search_content', { query: 'foo' }, controller.signal)
      expect(result.status).toBe(ToolCallResponseStatus.Aborted)
    })

    it('keyword mode finds files containing the query', async () => {
      const files = [
        makeFile('recipes/cake.md', 'cake.md'),
        makeFile('notes/other.md', 'other.md'),
      ]
      const app = makeApp({
        getFiles: jest.fn().mockReturnValue(files),
        cachedRead: jest.fn().mockImplementation((f: TFile) =>
          Promise.resolve(f.path === 'recipes/cake.md' ? 'Add 1 tsp cinnamon to mix.' : 'No spices here.')
        ),
      })
      const vt = new VaultTools(app, jest.fn())
      const result = await vt.callTool('vault_search_content', { query: 'cinnamon', mode: 'keyword' })
      expect(result.status).toBe(ToolCallResponseStatus.Success)
      if (result.status === ToolCallResponseStatus.Success) {
        const parsed = JSON.parse(result.data.text)
        expect(parsed.results).toHaveLength(1)
        expect(parsed.results[0].path).toBe('recipes/cake.md')
        expect(parsed.results[0].snippet).toContain('cinnamon')
        expect(parsed.truncated).toBe(false)
      }
    })

    it('semantic mode truncates results beyond 50', async () => {
      const ragResults = Array.from({ length: 55 }, (_, i) => ({
        path: `notes/a${i}.md`,
        content: 'foo',
        similarity: 0.9,
        metadata: { startLine: 1, endLine: 1 },
      }))
      const getRagEngine = jest.fn().mockResolvedValue({
        processQuery: jest.fn().mockResolvedValue(ragResults),
      })
      const vt = new VaultTools(makeApp(), getRagEngine)
      const result = await vt.callTool('vault_search_content', { query: 'foo' })
      expect(result.status).toBe(ToolCallResponseStatus.Success)
      if (result.status === ToolCallResponseStatus.Success) {
        const parsed = JSON.parse(result.data.text)
        expect(parsed.results).toHaveLength(50)
        expect(parsed.truncated).toBe(true)
      }
    })

    it('keyword mode sets truncated: true when results exceed limit', async () => {
      const files = Array.from({ length: 52 }, (_, i) =>
        makeFile(`notes/note${i}.md`, `note${i}.md`),
      )
      const app = makeApp({
        getFiles: jest.fn().mockReturnValue(files),
        cachedRead: jest.fn().mockResolvedValue('match'),
      })
      const vt = new VaultTools(app, jest.fn())
      const result = await vt.callTool('vault_search_content', { query: 'match', mode: 'keyword' })
      expect(result.status).toBe(ToolCallResponseStatus.Success)
      if (result.status === ToolCallResponseStatus.Success) {
        const parsed = JSON.parse(result.data.text)
        expect(parsed.results).toHaveLength(50)
        expect(parsed.truncated).toBe(true)
      }
    })

    it('keyword mode sets truncated: false when exactly 50 match and rest do not', async () => {
      const matching = Array.from({ length: 50 }, (_, i) =>
        makeFile(`notes/note${i}.md`, `note${i}.md`),
      )
      const nonMatching = Array.from({ length: 5 }, (_, i) =>
        makeFile(`notes/other${i}.md`, `other${i}.md`),
      )
      const app = makeApp({
        getFiles: jest.fn().mockReturnValue([...matching, ...nonMatching]),
        cachedRead: jest.fn().mockImplementation((file: { path: string }) =>
          Promise.resolve(file.path.includes('other') ? 'no hit' : 'match'),
        ),
      })
      const vt = new VaultTools(app, jest.fn())
      const result = await vt.callTool('vault_search_content', { query: 'match', mode: 'keyword' })
      expect(result.status).toBe(ToolCallResponseStatus.Success)
      if (result.status === ToolCallResponseStatus.Success) {
        const parsed = JSON.parse(result.data.text)
        expect(parsed.results).toHaveLength(50)
        expect(parsed.truncated).toBe(false)
      }
    })

    it('keyword mode respects glob filter', async () => {
      const files = [
        makeFile('recipes/cake.md', 'cake.md'),
        makeFile('notes/other.md', 'other.md'),
      ]
      const app = makeApp({
        getFiles: jest.fn().mockReturnValue(files),
        cachedRead: jest.fn().mockResolvedValue('cinnamon is here'),
      })
      const vt = new VaultTools(app, jest.fn())
      const result = await vt.callTool('vault_search_content', { query: 'cinnamon', mode: 'keyword', glob: 'notes/**' })
      expect(result.status).toBe(ToolCallResponseStatus.Success)
      if (result.status === ToolCallResponseStatus.Success) {
        const parsed = JSON.parse(result.data.text)
        expect(parsed.results).toHaveLength(1)
        expect(parsed.results[0].path).toBe('notes/other.md')
      }
    })

    it('returns error when glob matches no files (semantic)', async () => {
      const getRagEngine = jest.fn().mockResolvedValue({ processQuery: jest.fn() })
      const app = makeApp({ getFiles: jest.fn().mockReturnValue([]) })
      const vt = new VaultTools(app, getRagEngine)
      const result = await vt.callTool('vault_search_content', { query: 'foo', glob: 'nonexistent/**' })
      expect(result.status).toBe(ToolCallResponseStatus.Error)
    })

    it('returns error when glob matches no files (keyword)', async () => {
      const app = makeApp({ getFiles: jest.fn().mockReturnValue([]) })
      const vt = new VaultTools(app, jest.fn())
      const result = await vt.callTool('vault_search_content', { query: 'foo', mode: 'keyword', glob: 'nonexistent/**' })
      expect(result.status).toBe(ToolCallResponseStatus.Error)
    })
  })

  describe('callTool', () => {
    it('returns error for unknown tool name', async () => {
      const vt = new VaultTools(makeApp(), jest.fn())
      const result = await vt.callTool('vault_unknown', {})
      expect(result.status).toBe(ToolCallResponseStatus.Error)
    })
  })
})
