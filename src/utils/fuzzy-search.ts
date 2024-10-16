import fuzzysort from 'fuzzysort'
import { App, TFile } from 'obsidian'

import { calculateFileDistance, getOpenFiles } from './obsidian'

type FileWithMetadata = {
  path: string
  file: TFile
  opened: boolean
  distance: number | null
  daysSinceLastModified: number
}

function scoreFnWithBoost(score: number, fileWithMetadata: FileWithMetadata) {
  let boost = 1
  const { opened, distance, daysSinceLastModified } = fileWithMetadata

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

function getEmptyQueryResult(
  allFilesWithMetadata: FileWithMetadata[],
  limit: number,
) {
  // Sort files based on a custom scoring function
  const sortedFiles = allFilesWithMetadata.sort((a, b) => {
    const scoreA = scoreFnWithBoost(0.5, a) // Use 0.5 as a base score
    const scoreB = scoreFnWithBoost(0.5, b)
    return scoreB - scoreA // Sort in descending order
  })

  // Return only the top 'limit' files
  return sortedFiles.slice(0, limit).map((file) => file.file)
}

export function fuzzySearch(app: App, query: string): TFile[] {
  const currentFile = app.workspace.getActiveFile()
  const openFiles = getOpenFiles(app)

  const allSupportedFiles = app.vault.getFiles().filter((file) => {
    const extension = file.extension
    return extension === 'md'
  })

  const allFilesWithMetadata: FileWithMetadata[] = allSupportedFiles.map(
    (file) => ({
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
    }),
  )

  if (!query) {
    return getEmptyQueryResult(allFilesWithMetadata, 20)
  }

  const results = fuzzysort.go(query, allFilesWithMetadata, {
    keys: ['path'],
    threshold: 0.2,
    limit: 20,
    all: true,
    scoreFn: (result) => scoreFnWithBoost(result.score, result.obj),
  })

  return results.map((result) => result.obj.file)
}
