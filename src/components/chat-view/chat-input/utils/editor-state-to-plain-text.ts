import { SerializedEditorState, SerializedLexicalNode } from 'lexical'

export function editorStateToPlainText(
  editorState: SerializedEditorState,
): string {
  return lexicalNodeToPlainText(editorState.root)
}

function lexicalNodeToPlainText(node: SerializedLexicalNode): string {
  if ('children' in node) {
    // Process children recursively and join their results
    return (node.children as SerializedLexicalNode[])
      .map(lexicalNodeToPlainText)
      .join('')
  } else if (node.type === 'linebreak') {
    return '\n'
  } else if ('text' in node && typeof node.text === 'string') {
    return node.text
  }
  return ''
}
