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
      originalTokens?: InlineToken[]
      modifiedTokens?: InlineToken[]
    }

export type InlineToken = {
  text: string
  kind: 'equal' | 'added' | 'removed'
}

type DiffOp = {
  type: 'equal' | 'insert' | 'delete'
  value: string
}

const INLINE_DIFF_MAX_TOKENS = 300
const INLINE_DIFF_MAX_CHARS = 800

const tokenizeByWord = (value: string): string[] => {
  if (!value) return []
  const matches = value.match(/(\s+|[^\s]+)/g)
  return matches ?? []
}

const pushInlineToken = (
  tokens: InlineToken[],
  kind: InlineToken['kind'],
  text: string,
) => {
  if (!text) return
  const last = tokens[tokens.length - 1]
  if (last && last.kind === kind) {
    last.text += text
    return
  }
  tokens.push({ text, kind })
}

const diffSequence = (original: string[], modified: string[]): DiffOp[] => {
  const rows = original.length + 1
  const cols = modified.length + 1
  const dp: number[][] = Array.from({ length: rows }, () =>
    new Array(cols).fill(0),
  )
  const dir: number[][] = Array.from({ length: rows }, () =>
    new Array(cols).fill(0),
  )

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      if (original[i - 1] === modified[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
        dir[i][j] = 1
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        dp[i][j] = dp[i - 1][j]
        dir[i][j] = 2
      } else {
        dp[i][j] = dp[i][j - 1]
        dir[i][j] = 3
      }
    }
  }

  const ops: DiffOp[] = []
  let i = original.length
  let j = modified.length
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dir[i][j] === 1) {
      ops.push({ type: 'equal', value: original[i - 1] })
      i -= 1
      j -= 1
    } else if (i > 0 && (j === 0 || dir[i][j] === 2)) {
      ops.push({ type: 'delete', value: original[i - 1] })
      i -= 1
    } else if (j > 0) {
      ops.push({ type: 'insert', value: modified[j - 1] })
      j -= 1
    }
  }

  return ops.reverse()
}

const buildInlineTokens = (
  originalValue?: string,
  modifiedValue?: string,
): { originalTokens: InlineToken[]; modifiedTokens: InlineToken[] } | null => {
  const originalText = originalValue ?? ''
  const modifiedText = modifiedValue ?? ''
  if (!originalText && !modifiedText) return null

  const originalTokens = tokenizeByWord(originalText)
  const modifiedTokens = tokenizeByWord(modifiedText)
  if (originalTokens.length + modifiedTokens.length > INLINE_DIFF_MAX_TOKENS) {
    return null
  }

  const ops = diffSequence(originalTokens, modifiedTokens)
  const originalInline: InlineToken[] = []
  const modifiedInline: InlineToken[] = []

  for (let index = 0; index < ops.length; index++) {
    const op = ops[index]
    if (op.type === 'equal') {
      pushInlineToken(originalInline, 'equal', op.value)
      pushInlineToken(modifiedInline, 'equal', op.value)
      continue
    }

    let deletes = ''
    let inserts = ''
    let j = index
    while (j < ops.length && ops[j].type !== 'equal') {
      if (ops[j].type === 'delete') {
        deletes += ops[j].value
      } else if (ops[j].type === 'insert') {
        inserts += ops[j].value
      }
      j += 1
    }

    if (deletes && inserts && deletes.length + inserts.length <= INLINE_DIFF_MAX_CHARS) {
      const charOps = diffSequence(deletes.split(''), inserts.split(''))
      charOps.forEach((charOp) => {
        if (charOp.type === 'equal') {
          pushInlineToken(originalInline, 'equal', charOp.value)
          pushInlineToken(modifiedInline, 'equal', charOp.value)
        } else if (charOp.type === 'delete') {
          pushInlineToken(originalInline, 'removed', charOp.value)
        } else if (charOp.type === 'insert') {
          pushInlineToken(modifiedInline, 'added', charOp.value)
        }
      })
    } else {
      if (deletes) {
        pushInlineToken(originalInline, 'removed', deletes)
      }
      if (inserts) {
        pushInlineToken(modifiedInline, 'added', inserts)
      }
    }

    index = j - 1
  }

  return { originalTokens: originalInline, modifiedTokens: modifiedInline }
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
      const inlineTokens = buildInlineTokens(originalValue, modifiedValue)
      blocks.push({
        type: 'modified',
        originalValue: originalValue.length > 0 ? originalValue : undefined,
        modifiedValue: modifiedValue.length > 0 ? modifiedValue : undefined,
        originalTokens:
          inlineTokens && originalValue.length > 0
            ? inlineTokens.originalTokens
            : undefined,
        modifiedTokens:
          inlineTokens && modifiedValue.length > 0
            ? inlineTokens.modifiedTokens
            : undefined,
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
