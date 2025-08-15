import { TextAreaComponent } from 'obsidian'
import { useEffect, useRef, useState } from 'react'

import { useObsidianSetting } from './ObsidianSetting'

type ObsidianTextAreaProps = {
  value: string
  placeholder?: string
  onChange: (value: string) => void
}

export function ObsidianTextArea({
  value,
  placeholder,
  onChange,
}: ObsidianTextAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { setting } = useObsidianSetting()
  const [textAreaComponent, setTextAreaComponent] =
    useState<TextAreaComponent | null>(null)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    if (setting) {
      let newTextAreaComponent: TextAreaComponent | null = null
      setting.addTextArea((component) => {
        newTextAreaComponent = component
      })
      setTextAreaComponent(newTextAreaComponent)

      return () => {
        newTextAreaComponent?.inputEl.remove()
      }
    } else if (containerRef.current) {
      const newTextAreaComponent = new TextAreaComponent(containerRef.current)
      setTextAreaComponent(newTextAreaComponent)

      return () => {
        newTextAreaComponent?.inputEl.remove()
      }
    }
  }, [setting])

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!textAreaComponent) return
    textAreaComponent.onChange((v) => onChangeRef.current(v))
  }, [textAreaComponent])

  useEffect(() => {
    if (!textAreaComponent) return
    if (placeholder) textAreaComponent.setPlaceholder(placeholder)
    textAreaComponent.setValue(value)
  }, [textAreaComponent, value, placeholder])

  return <div ref={containerRef} />
}
