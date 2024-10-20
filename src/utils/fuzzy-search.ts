import fuzzysort from 'fuzzysort'
import { App, TFile, TFolder } from 'obsidian'

import {
  MentionableFile,
  MentionableFolder,
  MentionableVault,
} from '../types/mentionable'

import { calculateFileDistance, getOpenFiles } from './obsidian'

export type SearchResultItem =
  | MentionableFile
  | MentionableFolder
  | MentionableVault

type SearchItem = FolderWithMetadata | FileWithMetadata | VaultSearchItem

type VaultSearchItem = {
  type: 'vault'
  path: string
}

type FileWithMetadata = {
  type: 'file'
  path: string
  file: TFile
  opened: boolean
  distance: number | null
  daysSinceLastModified: number
}

type FolderWithMetadata = {
  type: 'folder'
  path: string
  folder: TFolder
}

function scoreFnWithBoost(score: number, searchItem: SearchItem) {
  switch (searchItem.type) {
    case 'file': {
      let boost = 1
      const { opened, distance, daysSinceLastModified } = searchItem

      // Boost for open files
      if (opened) boost = Math.max(boost, 3)

      // Boost for recently modified files
      if (daysSinceLastModified < 30) {
        const recentBoost = 1 + 2 / (daysSinceLastModified + 2)
        boost = Math.max(boost, recentBoost)
      }

      // Boost for nearby files
      if (distance !== null && distance > 0 && distance <= 5) {
        const nearbyBoost = 1 + 0.5 / Math.max(distance - 1, 1)
        boost = Math.max(boost, nearbyBoost)
      }

      // Normalize the boost
      const normalizedBoost =
        boost > 1 ? Math.log(boost * score + 1) / Math.log(boost + 1) : score
      return normalizedBoost
    }
    // TODO: Implement scoring logic for folders
    case 'folder': {
      return score
    }
    // TODO: Implement scoring logic for vault
    case 'vault': {
      return score
    }
  }
}

function getEmptyQueryResult(
  searchItems: SearchItem[],
  limit: number,
): SearchResultItem[] {
  // Sort files based on a custom scoring function
  const sortedFiles = searchItems.sort((a, b) => {
    const scoreA = scoreFnWithBoost(0.5, a) // Use 0.5 as a base score
    const scoreB = scoreFnWithBoost(0.5, b)
    return scoreB - scoreA // Sort in descending order
  })

  // Return only the top 'limit' files
  return sortedFiles.slice(0, limit).map((item) => {
    switch (item.type) {
      case 'file':
        return {
          type: 'file',
          file: item.file,
        }
      case 'folder':
        return {
          type: 'folder',
          folder: item.folder,
        }
      case 'vault':
        return {
          type: 'vault',
        }
    }
  })
}

export function fuzzySearch(app: App, query: string): SearchResultItem[] {
  const currentFile = app.workspace.getActiveFile()
  const openFiles = getOpenFiles(app)

  const allSupportedFiles = app.vault.getFiles().filter((file) => {
    const extension = file.extension
    return extension === 'md'
  })

  const allFilesWithMetadata: SearchItem[] = allSupportedFiles.map((file) => ({
    type: 'file',
    path: file.path,
    file,
    opened: openFiles.some((f) => f.path === file.path),
    distance: currentFile
      ? currentFile === file
        ? null
        : calculateFileDistance(currentFile, file)
      : null,
    daysSinceLastModified:
      (Date.now() - file.stat.mtime) / (1000 * 60 * 60 * 24),
  }))

  const allFolders = app.vault.getAllFolders()
  const allFoldersWithMetadata: SearchItem[] = allFolders.map((folder) => ({
    type: 'folder',
    path: folder.path,
    folder,
  }))

  const vaultItem: VaultSearchItem = {
    type: 'vault',
    path: 'vault',
  }

  const searchItems: SearchItem[] = [
    ...allFilesWithMetadata,
    ...allFoldersWithMetadata,
    vaultItem,
  ]

  if (!query) {
    return getEmptyQueryResult(searchItems, 20)
  }

  const results = fuzzysort.go(query, searchItems, {
    keys: ['path'],
    threshold: 0.2,
    limit: 20,
    all: true,
    scoreFn: (result) => scoreFnWithBoost(result.score, result.obj),
  })

  return results.map((result) => {
    switch (result.obj.type) {
      case 'file':
        return {
          type: 'file',
          file: result.obj.file,
        }
      case 'folder':
        return {
          type: 'folder',
          folder: result.obj.folder,
        }
      case 'vault':
        return {
          type: 'vault',
        }
    }
  })
}
