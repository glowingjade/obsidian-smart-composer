import { DropdownComponent } from 'obsidian'
import { useEffect, useRef, useState } from 'react'

import { useObsidianSetting } from './ObsidianSetting'

type ObsidianDropdownProps = {
  value: string
  options: Record<string, string>
  onChange: (value: string) => void
}

export function ObsidianDropdown({
  value,
  options,
  onChange,
}: ObsidianDropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { setting } = useObsidianSetting()
  const [dropdownComponent, setDropdownComponent] =
    useState<DropdownComponent | null>(null)

  useEffect(() => {
    if (setting) {
      let newDropdownComponent: DropdownComponent | null = null
      setting.addDropdown((component) => {
        newDropdownComponent = component
      })
      setDropdownComponent(newDropdownComponent)

      return () => {
        newDropdownComponent?.selectEl.remove()
      }
    } else if (containerRef.current) {
      const newDropdownComponent = new DropdownComponent(containerRef.current)
      setDropdownComponent(newDropdownComponent)

      return () => {
        newDropdownComponent?.selectEl.remove()
      }
    }
  }, [setting])

  useEffect(() => {
    if (!dropdownComponent) return

    dropdownComponent.selectEl.empty()
    dropdownComponent.addOptions(options)
    dropdownComponent.setValue(value)
    dropdownComponent.onChange(onChange)
  }, [dropdownComponent, options, value, onChange])

  return <div ref={containerRef} />
}
