import { ToggleComponent } from 'obsidian'
import { useEffect, useRef, useState } from 'react'

import { useObsidianSetting } from './ObsidianSetting'

type ObsidianToggleProps = {
  value: boolean
  onChange: (value: boolean) => void
}

export function ObsidianToggle({ value, onChange }: ObsidianToggleProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { setting } = useObsidianSetting()
  const [toggleComponent, setToggleComponent] =
    useState<ToggleComponent | null>(null)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    if (setting) {
      let newToggleComponent: ToggleComponent | null = null
      setting.addToggle((component) => {
        newToggleComponent = component
      })
      setToggleComponent(newToggleComponent)

      return () => {
        newToggleComponent?.toggleEl.remove()
      }
    } else if (containerRef.current) {
      const newToggleComponent = new ToggleComponent(containerRef.current)
      setToggleComponent(newToggleComponent)

      return () => {
        newToggleComponent?.toggleEl.remove()
      }
    }
  }, [setting])

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!toggleComponent) return
    toggleComponent.onChange((v) => onChangeRef.current(v))
  }, [toggleComponent])

  useEffect(() => {
    if (!toggleComponent) return
    toggleComponent.setValue(value)
  }, [toggleComponent, value])

  return <div ref={containerRef} style={{ display: 'contents' }} />
}
