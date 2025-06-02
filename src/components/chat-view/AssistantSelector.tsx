import * as Popover from '@radix-ui/react-popover'
import { ChevronDown } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { useSettings } from '../../contexts/settings-context'
import { Assistant } from '../../types/assistant.types'

export function AssistantSelector() {
  const { settings, setSettings } = useSettings()
  const [open, setOpen] = useState(false)
  
  // 获取助手列表和当前选中的助手
  const assistants = settings.assistants || []
  const currentAssistantId = settings.currentAssistantId
  
  // 获取当前选中的助手对象
  const currentAssistant = assistants.find(a => a.id === currentAssistantId) || 
                          (assistants.length > 0 ? assistants.find(a => a.isDefault) || assistants[0] : null)

  // 当没有选中的助手但有可用助手时，自动选择默认助手或第一个助手
  useEffect(() => {
    if (!currentAssistantId && assistants.length > 0) {
      const defaultAssistant = assistants.find(a => a.isDefault) || assistants[0]
      setSettings({
        ...settings,
        currentAssistantId: defaultAssistant.id
      })
    }
  }, [currentAssistantId, assistants, settings, setSettings])

  // 选择助手的处理函数
  const handleSelectAssistant = async (assistant: Assistant) => {
    await setSettings({
      ...settings,
      currentAssistantId: assistant.id
    })
    setOpen(false)
  }

  // 如果没有助手，显示一个占位符
  if (assistants.length === 0) {
    return (
      <div className="smtcmp-assistant-selector smtcmp-assistant-selector-empty">
        <span className="smtcmp-assistant-selector-placeholder">无可用助手</span>
      </div>
    )
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className="smtcmp-assistant-selector-button">
          <span className="smtcmp-assistant-selector-current">
            {currentAssistant ? currentAssistant.name : '选择助手'}
          </span>
          <ChevronDown size={16} />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content className="smtcmp-popover smtcmp-assistant-selector-content">
          <ul className="smtcmp-assistant-selector-list">
            {assistants.map((assistant) => (
              <li
                key={assistant.id}
                className={`smtcmp-assistant-selector-item ${
                  assistant.id === currentAssistantId ? 'selected' : ''
                }`}
                onClick={() => handleSelectAssistant(assistant)}
              >
                <div className="smtcmp-assistant-selector-item-name">
                  {assistant.name}
                </div>
                {assistant.description && (
                  <div className="smtcmp-assistant-selector-item-description">
                    {assistant.description}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
