import { minimatch } from 'minimatch'
import { Vault } from 'obsidian'

export const findFilesMatchingPatterns = async (
  patterns: string[],
  vault: Vault,
) => {
  const files = vault.getMarkdownFiles()
  return files.filter((file) => {
    return patterns.some((pattern) => minimatch(file.path, pattern))
  })
}

/**
 * Builds a glob exclude pattern for a vault path.
 *
 * Folders are expanded to match every descendant (`path/**`) so that all files
 * inside the folder are excluded; files are matched by their exact path. The
 * resulting pattern is compatible with the minimatch-based include/exclude
 * filtering used during indexing.
 *
 * @param path - The vault-relative path of the file or folder.
 * @param isFolder - Whether the path points to a folder.
 * @returns A glob pattern suitable for `ragOptions.excludePatterns`.
 */
export const getExcludePatternForPath = (
  path: string,
  isFolder: boolean,
): string => {
  return isFolder ? `${path}/**` : path
}

/**
 * Returns true if any segment of the vault path starts with a dot, i.e. the
 * file or one of its parent folders is hidden (e.g. `.obsidian/...`,
 * `.trash/note.md`, `notes/.archive/old.md`).
 */
export const isHiddenPath = (path: string): boolean => {
  return path.split('/').some((segment) => segment.startsWith('.'))
}

/**
 * Decides whether a vault file path is eligible for indexing under the given
 * RAG options. A file is indexed when it is not hidden (when hidden files are
 * excluded), not matched by any exclude pattern, and—when include patterns are
 * set—matched by at least one of them.
 */
export const isPathIndexable = (
  path: string,
  {
    excludePatterns,
    includePatterns,
    excludeHiddenFiles,
  }: {
    excludePatterns: string[]
    includePatterns: string[]
    excludeHiddenFiles: boolean
  },
): boolean => {
  if (excludeHiddenFiles && isHiddenPath(path)) {
    return false
  }
  if (excludePatterns.some((pattern) => minimatch(path, pattern))) {
    return false
  }
  if (
    includePatterns.length > 0 &&
    !includePatterns.some((pattern) => minimatch(path, pattern))
  ) {
    return false
  }
  return true
}
