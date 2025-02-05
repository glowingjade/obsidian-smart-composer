import { Setting } from 'obsidian'
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

import { classNames } from '../../utils/classnames'

type SettingContextValue = {
  setting: Setting | null
}

const SettingContext = createContext<SettingContextValue>({ setting: null })

type ObsidianSettingProps = {
  name?: string
  desc?: string
  heading?: boolean
  className?: string
  required?: boolean
  children?: React.ReactNode
}

export function ObsidianSetting({
  name,
  desc,
  heading,
  className,
  required,
  children,
}: ObsidianSettingProps) {
  const [setting, setSetting] = useState<Setting | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const defaultSettingElClassName = useRef('')
  const defaultNameElClassName = useRef('')

  useEffect(() => {
    if (!containerRef.current) return

    const newSetting = new Setting(containerRef.current)
    setSetting(newSetting)
    defaultSettingElClassName.current = newSetting.settingEl.className
    defaultNameElClassName.current = newSetting.nameEl.className

    return () => {
      newSetting.clear()
    }
  }, [])

  useEffect(() => {
    if (!setting) return

    setting.setName(name ?? '')
    setting.setDesc(desc ?? '')
    if (heading) setting.setHeading()
    setting.settingEl.setAttrs({
      class: classNames(defaultSettingElClassName.current, className ?? ''),
    })
    setting.nameEl.setAttrs({
      class: classNames(
        defaultNameElClassName.current,
        required ? 'smtcmp-settings-required' : '',
      ),
    })
  }, [name, desc, heading, className, setting, required])

  return (
    <SettingContext.Provider value={{ setting }}>
      <div ref={containerRef}>{children}</div>
    </SettingContext.Provider>
  )
}

export const useObsidianSetting = () => {
  const context = useContext(SettingContext)
  if (!context) {
    throw new Error('useObsidianSetting must be used within ObsidianSetting')
  }
  return context
}
