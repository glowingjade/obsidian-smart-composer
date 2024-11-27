import { App, Editor, MarkdownView, TFile, TFolder, Vault } from 'obsidian'

import { MentionableBlockData } from '../types/mentionable'

export async function readTFileContent(
  file: TFile,
  vault: Vault,
): Promise<string> {
  return await vault.cachedRead(file)
}

export async function readMultipleTFiles(
  files: TFile[],
  vault: Vault,
): Promise<string[]> {
  // Read files in parallel
  const readPromises = files.map((file) => readTFileContent(file, vault))
  return await Promise.all(readPromises)
}

export function getNestedFiles(folder: TFolder, vault: Vault): TFile[] {
  const files: TFile[] = []
  for (const child of folder.children) {
    if (child instanceof TFile) {
      files.push(child)
    } else if (child instanceof TFolder) {
      files.push(...getNestedFiles(child, vault))
    }
  }
  return files
}

export async function getMentionableBlockData(
  editor: Editor,
  view: MarkdownView,
): Promise<MentionableBlockData | null> {
  const file = view.file
  if (!file) return null

  const selection = editor.getSelection()
  if (!selection) return null

  const startLine = editor.getCursor('from').line
  const endLine = editor.getCursor('to').line
  const selectionContent = editor
    .getValue()
    .split('\n')
    .slice(startLine, endLine + 1)
    .join('\n')

  return {
    content: selectionContent,
    file,
    startLine: startLine + 1, // +1 because startLine is 0-indexed
    endLine: endLine + 1, // +1 because startLine is 0-indexed
  }
}

export function getOpenFiles(app: App): TFile[] {
  try {
    const leaves = app.workspace.getLeavesOfType('markdown')

    return leaves.map((v) => (v.view as MarkdownView).file).filter((v) => !!v)
  } catch (e) {
    return []
  }
}

export function calculateFileDistance(
  file1: TFile | TFolder,
  file2: TFile | TFolder,
): number | null {
  const path1 = file1.path.split('/')
  const path2 = file2.path.split('/')

  // Check if files are in different top-level folders
  if (path1[0] !== path2[0]) {
    return null
  }

  let distance = 0
  let i = 0

  // Find the common ancestor
  while (i < path1.length && i < path2.length && path1[i] === path2[i]) {
    i++
  }

  // Calculate distance from common ancestor to each file
  distance += path1.length - i
  distance += path2.length - i

  return distance
}

export function openMarkdownFile(
  app: App,
  filePath: string,
  startLine?: number,
) {
  const file = app.vault.getFileByPath(filePath)
  if (!file) return

  const existingLeaf = app.workspace
    .getLeavesOfType('markdown')
    .find(
      (leaf) =>
        leaf.view instanceof MarkdownView && leaf.view.file?.path === file.path,
    )

  if (existingLeaf) {
    app.workspace.setActiveLeaf(existingLeaf, { focus: true })

    if (startLine) {
      const view = existingLeaf.view as MarkdownView
      view.setEphemeralState({ line: startLine - 1 }) // -1 because line is 0-indexed
    }
  } else {
    const leaf = app.workspace.getLeaf('tab')
    leaf.openFile(file, {
      eState: startLine ? { line: startLine - 1 } : undefined, // -1 because line is 0-indexed
    })
  }
}
