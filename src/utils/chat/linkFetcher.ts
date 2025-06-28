import { App, TFile } from 'obsidian';

/**
 * Performs a Breadth-First Search (BFS) on the link graph to a specified depth.
 * @param startPath The starting file path.
 * @param depth The recursion depth.
 * @param getLinks A function that returns the links for a given path.
 * @param app The Obsidian App instance.
 * @returns A promise that resolves to an array of unique file paths.
 */
async function traverseLinks(
  startPath: string,
  depth: number,
  getLinks: (path: string) => string[],
  app: App,
): Promise<string[]> {
  if (depth <= 0) {
    return [];
  }

  const queue: { path: string; level: number }[] = [{ path: startPath, level: 0 }];
  const visited = new Set<string>([startPath]);
  const allLinks = new Set<string>();

  while (queue.length > 0) {
    const { path, level } = queue.shift()!;

    if (level >= depth) {
      continue;
    }

    const newLinks = getLinks(path);

    for (const link of newLinks) {
      if (!visited.has(link)) {
        visited.add(link);
        allLinks.add(link);
        queue.push({ path: link, level: level + 1 });
      }
    }
  }

  return Array.from(allLinks);
}

/**
 * Fetches forward links from a given file to a specified depth.
 * @param sourcePath The path of the source file.
 * @param depth The recursion depth.
 * @param app The Obsidian App instance.
 * @returns A promise that resolves to an array of unique file paths.
 */
export async function getForwardLinks(sourcePath: string, depth: number, app: App): Promise<string[]> {
  const getLinks = (path: string) => {
    const file = app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
        const links = app.metadataCache.getCache(path)?.links ?? [];
        return links.map(link => app.metadataCache.getFirstLinkpathDest(link.link, path)?.path).filter((p): p is string => !!p) ?? [];
    }
    return [];
  };
  return traverseLinks(sourcePath, depth, getLinks, app);
}

/**
 * Fetches backward links to a given file to a specified depth.
 * @param sourcePath The path of the source file.
 * @param depth The recursion depth.
 * @param app The Obsidian App instance.
 * @returns A promise that resolves to an array of unique file paths.
 */
export async function getBackwardLinks(sourcePath: string, depth: number, app: App): Promise<string[]> {
    const getLinks = (path: string): string[] => {
        const file = app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) {
            const backlinks = app.metadataCache.getBacklinksForFile(file);
            // The 'data' property is a Map where keys are the file paths of notes with backlinks.
            return Array.from(backlinks.data.keys());
        }
        return [];
    };

    return traverseLinks(sourcePath, depth, getLinks, app);
}


/**
 * Fetches and combines forward and backward linked notes.
 * @param sourcePath The path of the source file.
 * @param forwardDepth The depth for forward links.
 * @param backwardDepth The depth for backward links.
 * @param app The Obsidian App instance.
 * @returns A promise that resolves to an array of unique file paths.
 */
export async function fetchLinkedNotes(
    sourcePath: string,
    forwardDepth: number,
    backwardDepth: number,
    app: App
): Promise<string[]> {
    const sourceFile = app.vault.getAbstractFileByPath(sourcePath);
    if (!(sourceFile instanceof TFile)) {
        console.error("Source path for link fetching is not a valid file:", sourcePath);
        return [];
    }
    
    const forwardLinks = forwardDepth > 0 ? await getForwardLinks(sourcePath, forwardDepth, app) : [];
    const backwardLinks = backwardDepth > 0 ? await getBackwardLinks(sourcePath, backwardDepth, app) : [];

    const allLinks = new Set([...forwardLinks, ...backwardLinks]);
    
    if (forwardDepth > 1) {
        const secondOrderBackwardLinks = (await Promise.all(forwardLinks.map(link => getBackwardLinks(link, 1, app)))).flat();
        secondOrderBackwardLinks.forEach(link => allLinks.add(link));
    }

    if (backwardDepth > 1) {
        const secondOrderForwardLinks = (await Promise.all(backwardLinks.map(link => getForwardLinks(link, 1, app)))).flat();
        secondOrderForwardLinks.forEach(link => allLinks.add(link));
    }
    
    return Array.from(allLinks);
}