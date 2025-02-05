import { ButtonComponent } from 'obsidian'
import { useEffect, useRef, useState } from 'react'

import { useObsidianSetting } from './ObsidianSetting'

type ObsidianButtonProps = {
  text?: string
  icon?: string
  tooltip?: string
  onClick: () => void
  cta?: boolean
  warning?: boolean
  disabled?: boolean
}

export function ObsidianButton({
  text,
  icon,
  tooltip,
  onClick,
  cta,
  warning,
  disabled,
}: ObsidianButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { setting } = useObsidianSetting()
  const [buttonComponent, setButtonComponent] =
    useState<ButtonComponent | null>(null)

  useEffect(() => {
    if (setting) {
      let newButtonComponent: ButtonComponent | null = null
      setting.addButton((component) => {
        newButtonComponent = component
      })
      setButtonComponent(newButtonComponent)

      return () => {
        newButtonComponent?.buttonEl.remove()
      }
    } else if (containerRef.current) {
      const newButtonComponent = new ButtonComponent(containerRef.current)
      setButtonComponent(newButtonComponent)

      return () => {
        newButtonComponent?.buttonEl.remove()
      }
    }
  }, [setting])

  useEffect(() => {
    if (!buttonComponent) return

    if (text) buttonComponent.setButtonText(text)
    if (icon) buttonComponent.setIcon(icon)
    if (tooltip) buttonComponent.setTooltip(tooltip)
    if (cta) buttonComponent.setCta()
    if (warning) buttonComponent.setWarning()
    buttonComponent.setDisabled(!!disabled)
    buttonComponent.onClick(onClick)
  }, [buttonComponent, text, icon, tooltip, onClick, cta, warning, disabled])

  return <div ref={containerRef} />
}
