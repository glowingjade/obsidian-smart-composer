import {
  AdvancedLinesDiffComputer,
  ILinesDiffComputerOptions,
  LineRangeMapping,
} from 'vscode-diff'

export type DiffBlock =
  | {
      type: 'unchanged'
      value: string
    }
  | {
      type: 'modified'
      originalValue?: string
      modifiedValue?: string
    }

export function createDiffBlocks(
  currentMarkdown: string,
  incomingMarkdown: string,
): DiffBlock[] {
  const blocks: DiffBlock[] = []

  const advOptions: ILinesDiffComputerOptions = {
    ignoreTrimWhitespace: false,
    computeMoves: true,
    maxComputationTimeMs: 0,
  }
  const advDiffComputer = new AdvancedLinesDiffComputer()

  const currentLines = currentMarkdown.split('\n')
  const incomingLines = incomingMarkdown.split('\n')
  const advLineChanges = advDiffComputer.computeDiff(
    currentLines,
    incomingLines,
    advOptions,
  ).changes

  let lastOriginalEndLineNumberExclusive = 1 // 1-indexed
  advLineChanges.forEach((change: LineRangeMapping) => {
    const oStart = change.originalRange.startLineNumber
    const oEnd = change.originalRange.endLineNumberExclusive
    const mStart = change.modifiedRange.startLineNumber
    const mEnd = change.modifiedRange.endLineNumberExclusive

    // Emit unchanged blocks
    if (oStart > lastOriginalEndLineNumberExclusive) {
      const unchangedValue = currentLines
        .slice(lastOriginalEndLineNumberExclusive - 1, oStart - 1)
        .join('\n')
      if (unchangedValue.length > 0) {
        blocks.push({
          type: 'unchanged',
          value: unchangedValue,
        })
      }
    }

    // Emit modified blocks
    const originalValue = currentLines.slice(oStart - 1, oEnd - 1).join('\n')
    const modifiedValue = incomingLines.slice(mStart - 1, mEnd - 1).join('\n')
    if (originalValue.length > 0 || modifiedValue.length > 0) {
      blocks.push({
        type: 'modified',
        originalValue: originalValue.length > 0 ? originalValue : undefined,
        modifiedValue: modifiedValue.length > 0 ? modifiedValue : undefined,
      })
    }

    lastOriginalEndLineNumberExclusive = oEnd
  })

  // Emit final unchanged blocks (if any)
  if (currentLines.length > lastOriginalEndLineNumberExclusive - 1) {
    const unchangedValue = currentLines
      .slice(lastOriginalEndLineNumberExclusive - 1)
      .join('\n')
    if (unchangedValue.length > 0) {
      blocks.push({
        type: 'unchanged',
        value: unchangedValue,
      })
    }
  }

  return blocks
}
