import { App, Modal } from 'obsidian'
import React from 'react'
import { Root, createRoot } from 'react-dom/client'

type ModalProps<T> = {
  app: App
  Component: React.ComponentType<T>
  props: Omit<T, 'onClose'>
  options?: { title?: string }
}

export class ReactModal<T> extends Modal {
  private root: Root | null = null
  private Component: React.ComponentType<T>
  private props: Omit<T, 'onClose'>
  private options?: { title?: string }

  constructor({ app, Component, props, options }: ModalProps<T>) {
    super(app)
    this.Component = Component
    this.props = props
    this.options = options
  }

  onOpen() {
    if (this.options?.title) this.titleEl.setText(this.options.title)
    this.root = createRoot(this.contentEl)
    this.root.render(
      <this.Component {...(this.props as T)} onClose={() => this.close()} />,
    )
  }

  onClose() {
    if (this.root) {
      this.root.unmount()
      this.root = null
    }
    this.contentEl.empty()
  }
}
