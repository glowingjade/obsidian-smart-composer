/**
 * Obsidian renders math via MathJax, but only recognizes the `$...$` (inline)
 * and `$$...$$` (block) delimiters. LLMs, however, commonly emit LaTeX using the
 * `\( ... \)` (inline) and `\[ ... \]` (block) delimiters. As a result, math in
 * assistant messages is shown as raw text instead of being rendered.
 *
 * This utility rewrites the LaTeX-style delimiters into the Obsidian-style
 * delimiters so that Obsidian's MarkdownRenderer renders the math properly.
 *
 * Code spans (`` `...` ``) and fenced code blocks (``` ``` ``` ```) are left
 * untouched so that LaTeX delimiters appearing inside code are preserved as-is.
 */

// Matches fenced code blocks (``` or ~~~) and inline code spans so we can skip
// over them while converting the surrounding prose.
const CODE_SEGMENT_REGEX = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`+[^`\n]*?`+)/g

function convertDelimiters(text: string): string {
  return (
    text
      // Block math: \[ ... \] -> $$ ... $$
      .replace(/\\\[([\s\S]*?)\\\]/g, (_match, inner: string) => `$$${inner}$$`)
      // Inline math: \( ... \) -> $ ... $
      .replace(/\\\(([\s\S]*?)\\\)/g, (_match, inner: string) => `$${inner}$`)
  )
}

/**
 * Converts LaTeX-style math delimiters (`\(...\)`, `\[...\]`) to the
 * Obsidian-style delimiters (`$...$`, `$$...$$`) outside of code regions.
 *
 * @param content - The raw markdown content (e.g. an assistant message).
 * @returns The content with math delimiters normalized for Obsidian.
 */
export function normalizeMathDelimiters(content: string): string {
  if (!content.includes('\\(') && !content.includes('\\[')) {
    return content
  }

  let result = ''
  let lastIndex = 0
  let match: RegExpExecArray | null

  CODE_SEGMENT_REGEX.lastIndex = 0
  while ((match = CODE_SEGMENT_REGEX.exec(content)) !== null) {
    // Convert the prose preceding this code segment.
    result += convertDelimiters(content.slice(lastIndex, match.index))
    // Preserve the code segment verbatim.
    result += match[0]
    lastIndex = match.index + match[0].length
  }

  // Convert any remaining prose after the last code segment.
  result += convertDelimiters(content.slice(lastIndex))

  return result
}
