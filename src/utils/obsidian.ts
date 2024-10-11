import { Editor, MarkdownView, TFile, Vault } from 'obsidian'

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
    startLine,
    endLine,
  }
}
