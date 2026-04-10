import { App, TFile, TFolder } from 'obsidian'
import { minimatch } from 'minimatch'

import { RAGEngine } from '../rag/ragEngine'
import { RequestTool } from '../../types/llm/request'
import {
  ToolCallResponse,
  ToolCallResponseStatus,
} from '../../types/tool-call.types'
import { readTFileContent } from '../../utils/obsidian'

type VaultToolName =
  | 'vault_read_file'
  | 'vault_list_directory'
  | 'vault_search_files'
  | 'vault_search_content'

const MAX_FILE_BYTES = 10 * 1024 * 1024

const READABLE_EXTENSIONS = new Set([
  'md', 'txt', 'json', 'yaml', 'yml',
  'base', 'canvas',
  'csv', 'log',
  'html', 'htm',
  'js', 'ts', 'py',
  'sh', 'bash',
  'css',
  'sql'
])

const VAULT_TOOL_NAMES: ReadonlySet<string> = new Set<VaultToolName>([
  'vault_read_file',
  'vault_list_directory',
  'vault_search_files',
  'vault_search_content',
])

export class VaultTools {
  constructor(
    private readonly app: App,
    private readonly getRagEngine: () => Promise<RAGEngine>,
  ) {}

  isNativeTool(name: string): boolean {
    return VAULT_TOOL_NAMES.has(name)
  }

  listTools(): RequestTool[] {
    return [
      {
        type: 'function',
        function: {
          name: 'vault_read_file',
          description: 'Read the content of a vault file by path',
          parameters: {
            type: 'object' as const,
            properties: {
              path: {
                type: 'string',
                description: 'Path to the file in the vault',
              },
            },
            required: ['path'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'vault_list_directory',
          description: 'List files and folders in a vault directory. Construct child paths as {path}/{entry.name} for non-root directories, or just {entry.name} for vault root.',
          parameters: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the directory (omit for vault root)',
              },
              page: {
                type: 'integer',
                description: 'Page number (0-indexed, default 0)',
                minimum: 0,
              },
              page_size: {
                type: 'integer',
                description: 'Number of entries per page (default 50, max 200)',
                minimum: 1,
                maximum: 200,
              },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'vault_search_files',
          description: 'Search vault files by filename or path. Supports regex patterns (e.g. "^Daily/.*\\.md$") or plain substring.',
          parameters: {
            type: 'object' as const,
            properties: {
              query: { type: 'string', description: 'Search query', minLength: 1 },
            },
            required: ['query'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'vault_search_content',
          description:
            'Search vault files by content. Use mode "keyword" for exact word/phrase matches (fast, literal). Use mode "semantic" (default) for conceptual/topic search via RAG embeddings.',
          parameters: {
            type: 'object' as const,
            properties: {
              query: { type: 'string', description: 'Search query', minLength: 1 },
              mode: { type: 'string', enum: ['semantic', 'keyword'], description: 'Search mode: "keyword" for literal text match, "semantic" for RAG vector search (default: "semantic")' },
              glob: { type: 'string', description: 'Optional glob pattern to restrict search to matching file paths (e.g. "Daily/**/*.md")' },
            },
            required: ['query'],
          },
        },
      },
    ]
  }

  async callTool(
    name: string,
    args: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<ToolCallResponse> {
    try {
      switch (name as VaultToolName) {
        case 'vault_read_file': {
          const path = typeof args.path === 'string' ? args.path.trim() : null
          if (!path)
            return { status: ToolCallResponseStatus.Error, error: 'path must be a non-empty string' }
          return await this.readFile(path)
        }
        case 'vault_list_directory': {
          if (args.path !== undefined && typeof args.path !== 'string')
            return { status: ToolCallResponseStatus.Error, error: 'path must be a string' }
          const path = typeof args.path === 'string' ? args.path.trim() : undefined
          const page = typeof args.page === 'number' ? Math.floor(args.page) : 0
          const pageSize = typeof args.page_size === 'number' ? Math.floor(args.page_size) : 50
          if (page < 0)
            return { status: ToolCallResponseStatus.Error, error: 'page must be >= 0' }
          if (pageSize < 1 || pageSize > 200)
            return { status: ToolCallResponseStatus.Error, error: 'page_size must be between 1 and 200' }
          return await this.listDirectory(path, page, pageSize)
        }
        case 'vault_search_files': {
          const query = typeof args.query === 'string' ? args.query.trim() : null
          if (!query)
            return { status: ToolCallResponseStatus.Error, error: 'query must be a non-empty string' }
          return this.searchFiles(query)
        }
        case 'vault_search_content': {
          const query = typeof args.query === 'string' ? args.query.trim() : null
          if (!query)
            return { status: ToolCallResponseStatus.Error, error: 'query must be a non-empty string' }
          const glob = typeof args.glob === 'string' ? args.glob.trim() : undefined
          const mode = args.mode === 'keyword' ? 'keyword' : 'semantic'
          return await this.searchContent(query, glob, mode, signal)
        }
        default:
          return {
            status: ToolCallResponseStatus.Error,
            error: `Unknown vault tool: ${name}`,
          }
      }
    } catch (error) {
      return {
        status: ToolCallResponseStatus.Error,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  private async readFile(path: string): Promise<ToolCallResponse> {
    const file = this.app.vault.getAbstractFileByPath(path)
    if (!(file instanceof TFile)) {
      return {
        status: ToolCallResponseStatus.Error,
        error: `File not found: ${path}`,
      }
    }
    if (!READABLE_EXTENSIONS.has(file.extension.toLowerCase())) {
      return {
        status: ToolCallResponseStatus.Error,
        error: `File type not supported for reading: .${file.extension}`,
      }
    }
    if (file.stat.size > MAX_FILE_BYTES) {
      return {
        status: ToolCallResponseStatus.Error,
        error: `File too large to read: ${file.stat.size} bytes`,
      }
    }
    const MAX_CHARS = 50_000
    const raw = await readTFileContent(file, this.app.vault)
    const content =
      raw.length > MAX_CHARS
        ? raw.slice(0, MAX_CHARS) + `\n... (truncated, ${raw.length - MAX_CHARS} chars omitted)`
        : raw
    return {
      status: ToolCallResponseStatus.Success,
      data: { type: 'text', text: content },
    }
  }

  private async listDirectory(path?: string, page = 0, pageSize = 50): Promise<ToolCallResponse> {
    const folder =
      !path || path === '/'
        ? this.app.vault.getRoot()
        : this.app.vault.getAbstractFileByPath(path)
    if (!(folder instanceof TFolder)) {
      return {
        status: ToolCallResponseStatus.Error,
        error: `Not a directory: ${path}`,
      }
    }
    const all = [...folder.children].sort((a, b) => {
      const aIsFolder = a instanceof TFolder
      const bIsFolder = b instanceof TFolder
      if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1
      if (!aIsFolder && !bIsFolder)
        return (b as TFile).stat.mtime - (a as TFile).stat.mtime
      return a.name.localeCompare(b.name)
    })
    const total = all.length
    const start = page * pageSize
    if (page > 0 && start >= total) {
      return {
        status: ToolCallResponseStatus.Error,
        error: `Page ${page} out of range (total entries: ${total}, page_size: ${pageSize})`,
      }
    }
    const entries = all.slice(start, start + pageSize).map((child) => ({
      name: child.name,
      type: child instanceof TFolder ? 'folder' : 'file',
    }))
    const result: { entries: typeof entries; page: number; page_size: number; total: number; has_more: boolean } = {
      entries,
      page,
      page_size: pageSize,
      total,
      has_more: start + pageSize < total,
    }
    return {
      status: ToolCallResponseStatus.Success,
      data: { type: 'text', text: JSON.stringify(result) },
    }
  }

  private searchFiles(query: string): ToolCallResponse {
    const MAX_RESULTS = 50
    let pattern: RegExp
    try {
      if (/\([^)]*[+*][^)]*\)[+*?{]/.test(query)) throw new Error('unsafe')
      pattern = new RegExp(query, 'i')
    } catch {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      pattern = new RegExp(escaped, 'i')
    }
    const all = this.app.vault
      .getFiles()
      .filter((f) => READABLE_EXTENSIONS.has(f.extension.toLowerCase()) && (pattern.test(f.path) || pattern.test(f.name)))
    const truncated = all.length > MAX_RESULTS
    const matches = all.slice(0, MAX_RESULTS).map((f) => f.path)
    return {
      status: ToolCallResponseStatus.Success,
      data: { type: 'text', text: JSON.stringify({ results: matches, truncated }) },
    }
  }

  private async searchContent(query: string, glob?: string, mode: 'semantic' | 'keyword' = 'semantic', signal?: AbortSignal): Promise<ToolCallResponse> {
    if (mode === 'keyword') {
      return this.searchContentKeyword(query, glob, signal)
    }
    const MAX_RESULTS = 50
    try {
      const ragEngine = await this.getRagEngine()
      if (signal?.aborted) return { status: ToolCallResponseStatus.Aborted }

      let scope: { files: string[]; folders: string[] } | undefined
      if (glob) {
        const files = this.app.vault
          .getFiles()
          .filter((f) => READABLE_EXTENSIONS.has(f.extension.toLowerCase()) && minimatch(f.path, glob, { matchBase: true }))
          .map((f) => f.path)
        if (files.length === 0)
          return { status: ToolCallResponseStatus.Error, error: `No files matched glob: ${glob}` }
        scope = { files, folders: [] }
      }

      const results = await ragEngine.processQuery({ query, scope })
      if (signal?.aborted) return { status: ToolCallResponseStatus.Aborted }

      const SNIPPET_PAD = 20
      const mapped = results.map(({ path, content, similarity, metadata }) => {
        const idx = content.toLowerCase().indexOf(query.toLowerCase())
        const snippet =
          idx >= 0
            ? content.slice(
                Math.max(0, idx - SNIPPET_PAD),
                Math.min(content.length, idx + query.length + SNIPPET_PAD),
              )
            : content.slice(0, SNIPPET_PAD * 2)
        return {
          path,
          snippet,
          similarity,
          startLine: metadata?.startLine,
          endLine: metadata?.endLine,
        }
      })
      const truncated = results.length > MAX_RESULTS
      return {
        status: ToolCallResponseStatus.Success,
        data: { type: 'text', text: JSON.stringify({ results: mapped.slice(0, MAX_RESULTS), truncated }) },
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { status: ToolCallResponseStatus.Aborted }
      }
      return {
        status: ToolCallResponseStatus.Error,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  private async searchContentKeyword(query: string, glob?: string, signal?: AbortSignal): Promise<ToolCallResponse> {
    const MAX_RESULTS = 50
    const SNIPPET_PAD = 60
    const lower = query.toLowerCase()
    let files = this.app.vault.getFiles()
    if (glob) {
      files = files.filter((f) => minimatch(f.path, glob, { matchBase: true }))
      if (files.length === 0)
        return { status: ToolCallResponseStatus.Error, error: `No files matched glob: ${glob}` }
    }
    const results: { path: string; snippet: string; line: number }[] = []
    let truncated = false
    for (const file of files) {
      if (signal?.aborted) return { status: ToolCallResponseStatus.Aborted }
      if (!READABLE_EXTENSIONS.has(file.extension.toLowerCase())) continue
      if (file.stat.size > MAX_FILE_BYTES) continue
      const content = await readTFileContent(file, this.app.vault)
      const idx = content.toLowerCase().indexOf(lower)
      if (idx < 0) continue
      if (results.length >= MAX_RESULTS) {
        truncated = true
        break
      }
      const snippet = content.slice(
        Math.max(0, idx - SNIPPET_PAD),
        Math.min(content.length, idx + query.length + SNIPPET_PAD),
      )
      const line = content.slice(0, idx).split('\n').length
      results.push({ path: file.path, snippet, line })
    }
    return {
      status: ToolCallResponseStatus.Success,
      data: { type: 'text', text: JSON.stringify({ results, truncated }) },
    }
  }
}
