import { parseFragment } from 'parse5'

export type ParsedTagContent =
  | { type: 'string'; content: string }
  | {
      type: 'smtcmp_block'
      content: string
      language?: string
      filename?: string
      startLine?: number
      endLine?: number
    }
  | {
      type: 'think'
      content: string
    }

/**
 * Parses text containing <smtcmp_block> and <think> tags into structured content
 */
export function parseTagContents(input: string): ParsedTagContent[] {
  const parsedResult: ParsedTagContent[] = []
  const fragment = parseFragment(input, {
    sourceCodeLocationInfo: true,
  })
  let lastEndOffset = 0
  for (const node of fragment.childNodes) {
    if (node.nodeName === 'smtcmp_block') {
      if (!node.sourceCodeLocation) {
        throw new Error('sourceCodeLocation is undefined')
      }
      const startOffset = node.sourceCodeLocation.startOffset
      const endOffset = node.sourceCodeLocation.endOffset
      if (startOffset > lastEndOffset) {
        parsedResult.push({
          type: 'string',
          content: input.slice(lastEndOffset, startOffset),
        })
      }

      const language = node.attrs.find(
        (attr) => attr.name === 'language',
      )?.value
      const filename = node.attrs.find(
        (attr) => attr.name === 'filename',
      )?.value
      const startLine = node.attrs.find(
        (attr) => attr.name === 'startline',
      )?.value
      const endLine = node.attrs.find((attr) => attr.name === 'endline')?.value

      const children = node.childNodes
      if (children.length === 0) {
        parsedResult.push({
          type: 'smtcmp_block',
          content: '',
          language,
          filename,
          startLine: startLine ? parseInt(startLine) : undefined,
          endLine: endLine ? parseInt(endLine) : undefined,
        })
      } else {
        const innerContentStartOffset =
          children[0].sourceCodeLocation?.startOffset
        const innerContentEndOffset =
          children[children.length - 1].sourceCodeLocation?.endOffset
        if (!innerContentStartOffset || !innerContentEndOffset) {
          throw new Error('sourceCodeLocation is undefined')
        }
        parsedResult.push({
          type: 'smtcmp_block',
          content: input.slice(innerContentStartOffset, innerContentEndOffset),
          language,
          filename,
          startLine: startLine ? parseInt(startLine) : undefined,
          endLine: endLine ? parseInt(endLine) : undefined,
        })
      }
      lastEndOffset = endOffset
    } else if (node.nodeName === 'think') {
      if (!node.sourceCodeLocation) {
        throw new Error('sourceCodeLocation is undefined')
      }
      const startOffset = node.sourceCodeLocation.startOffset
      const endOffset = node.sourceCodeLocation.endOffset
      if (startOffset > lastEndOffset) {
        parsedResult.push({
          type: 'string',
          content: input.slice(lastEndOffset, startOffset),
        })
      }

      const children = node.childNodes
      if (children.length > 0) {
        const innerContentStartOffset =
          children[0].sourceCodeLocation?.startOffset
        const innerContentEndOffset =
          children[children.length - 1].sourceCodeLocation?.endOffset
        if (!innerContentStartOffset || !innerContentEndOffset) {
          throw new Error('sourceCodeLocation is undefined')
        }
        parsedResult.push({
          type: 'think',
          content: input.slice(innerContentStartOffset, innerContentEndOffset),
        })
      }
      lastEndOffset = endOffset
    }
  }
  if (lastEndOffset < input.length) {
    parsedResult.push({
      type: 'string',
      content: input.slice(lastEndOffset),
    })
  }
  return parsedResult
}
