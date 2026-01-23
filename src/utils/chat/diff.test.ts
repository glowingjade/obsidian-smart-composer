import { createDiffBlocks } from './diff'

const getFirstModifiedBlock = (original: string, modified: string) => {
  const blocks = createDiffBlocks(original, modified)
  const modifiedBlock = blocks.find((block) => block.type === 'modified')
  if (!modifiedBlock || modifiedBlock.type !== 'modified') {
    throw new Error('Expected a modified block')
  }
  return modifiedBlock
}

describe('createDiffBlocks inline tokens', () => {
  it('marks inserted words as added tokens', () => {
    const block = getFirstModifiedBlock(
      'Hello world',
      'Hello brave world',
    )
    const added = block.modifiedTokens?.find(
      (token) => token.kind === 'added' && token.text.includes('brave'),
    )
    expect(added).toBeTruthy()
  })

  it('marks replaced words with removed/added tokens', () => {
    const block = getFirstModifiedBlock('Hello world', 'Hello earth')
    const removed = block.originalTokens?.find(
      (token) => token.kind === 'removed',
    )
    const added = block.modifiedTokens?.find(
      (token) => token.kind === 'added',
    )
    expect(removed).toBeTruthy()
    expect(added).toBeTruthy()
  })

  it('uses character-level highlights for small replacements', () => {
    const block = getFirstModifiedBlock('color', 'colour')
    const added = block.modifiedTokens?.find(
      (token) => token.kind === 'added' && token.text.includes('u'),
    )
    expect(added).toBeTruthy()
  })
})
