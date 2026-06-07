import { normalizeMathDelimiters } from './normalize-math'

/**
 * Central formatter for assistant-generated markdown before it is handed to
 * Obsidian's MarkdownRenderer.
 *
 * LLM output often needs light normalization so that it renders the way users
 * expect inside Obsidian (e.g. converting LaTeX-style math delimiters into the
 * `$...$` / `$$...$$` form Obsidian understands). Keeping these transforms in a
 * single pipeline means every assistant render path stays consistent and future
 * cleaners only need to be registered here.
 *
 * Note: this is intended for assistant *prose*. Do not run it over raw code
 * blocks or file reference previews, where the content should be shown verbatim.
 */
const transforms: ((content: string) => string)[] = [normalizeMathDelimiters]

export function formatAssistantMarkdown(content: string): string {
  return transforms.reduce(
    (formatted, transform) => transform(formatted),
    content,
  )
}
