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
