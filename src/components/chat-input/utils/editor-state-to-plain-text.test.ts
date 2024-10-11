import {
  SerializedEditorState,
  SerializedElementNode,
  SerializedTextNode,
} from 'lexical'

import { editorStateToPlainText } from './editor-state-to-plain-text'

describe('editorStateToPlainText', () => {
  it('should convert editor state to plain text', () => {
    const editorState: SerializedEditorState = {
      root: {
        children: [
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: 'Hello, world!',
                type: 'text',
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'paragraph',
            version: 1,
            textFormat: 0,
            textStyle: '',
          } as SerializedElementNode<SerializedTextNode>,
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    }
    const plainText = editorStateToPlainText(editorState)
    expect(plainText).toBe('Hello, world!')
  })
})
