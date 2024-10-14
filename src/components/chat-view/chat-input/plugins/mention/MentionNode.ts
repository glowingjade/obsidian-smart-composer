/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $applyNodeReplacement,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedTextNode,
  type Spread,
  TextNode,
} from 'lexical'

export const MENTION_NODE_TYPE = 'mention'
export const MENTION_NODE_ATTRIBUTE = 'data-lexical-mention'

export type SerializedMentionNode = Spread<
  {
    id: string
    mentionName: string
  },
  SerializedTextNode
>

// function $convertMentionElement(
//   domNode: HTMLElement,
// ): DOMConversionOutput | null {
//   const textContent = domNode.textContent

//   if (textContent !== null) {
//     const node = $createMentionNode(textContent)
//     return {
//       node,
//     }
//   }

//   return null
// }

export class MentionNode extends TextNode {
  __id: string
  __mention: string

  static getType(): string {
    return MENTION_NODE_TYPE
  }

  static clone(node: MentionNode): MentionNode {
    return new MentionNode(node.__id, node.__mention, node.__text, node.__key)
  }
  static importJSON(serializedNode: SerializedMentionNode): MentionNode {
    const node = $createMentionNode(
      serializedNode.id,
      serializedNode.mentionName,
    )
    node.setTextContent(serializedNode.text)
    node.setFormat(serializedNode.format)
    node.setDetail(serializedNode.detail)
    node.setMode(serializedNode.mode)
    node.setStyle(serializedNode.style)
    return node
  }

  constructor(id: string, mentionName: string, text?: string, key?: NodeKey) {
    // super(text ?? mentionName, key);
    super(`@${mentionName}`, key)
    this.__id = id
    this.__mention = mentionName
  }

  exportJSON(): SerializedMentionNode {
    return {
      ...super.exportJSON(),
      id: this.__id,
      mentionName: this.__mention,
      type: MENTION_NODE_TYPE,
      version: 1,
    }
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config)
    dom.className = MENTION_NODE_TYPE
    return dom
  }

  // exportDOM(): DOMExportOutput {
  //   const element = document.createElement('span')
  //   element.setAttribute(MENTION_NODE_ATTRIBUTE, 'true')
  //   element.textContent = this.__text
  //   return { element }
  // }

  // static importDOM(): DOMConversionMap | null {
  //   return {
  //     span: (domNode: HTMLElement) => {
  //       if (!domNode.hasAttribute(MENTION_NODE_ATTRIBUTE)) {
  //         return null
  //       }
  //       return {
  //         conversion: $convertMentionElement,
  //         priority: 1,
  //       }
  //     },
  //   }
  // }

  isTextEntity(): true {
    return true
  }

  canInsertTextBefore(): boolean {
    return false
  }

  canInsertTextAfter(): boolean {
    return false
  }

  getId(): string {
    return this.__id
  }
}

export function $createMentionNode(
  id: string,
  mentionName: string,
): MentionNode {
  const mentionNode = new MentionNode(id, mentionName)
  mentionNode.setMode('token').toggleDirectionless()
  return $applyNodeReplacement(mentionNode)
}

export function $isMentionNode(
  node: LexicalNode | null | undefined,
): node is MentionNode {
  return node instanceof MentionNode
}
