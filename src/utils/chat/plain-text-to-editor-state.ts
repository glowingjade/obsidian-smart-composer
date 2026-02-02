import { SerializedEditorState } from 'lexical'

/**
 * Convert a simple plain-text string into a minimal SerializedEditorState
 * that the rest of Smart Composer can consume. The structure only needs to
 * satisfy `editorStateToPlainText`, so we don't replicate every Lexical field.
 */
export function plainTextToEditorState(text: string): SerializedEditorState {
  return {
    root: {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              text: text,
            },
          ],
          format: '',
          indent: 0,
          direction: null,
        },
      ],
      format: '',
      indent: 0,
      direction: null,
    },
  } as unknown as SerializedEditorState
}
