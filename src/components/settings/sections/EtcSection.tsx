import { App, Notice } from 'obsidian'

import { useSettings } from '../../../contexts/settings-context'
import SmartComposerPlugin from '../../../main'
import { ConfirmModal } from '../../../settings/ConfirmModal'
import { smartComposerSettingsSchema } from '../../../settings/schema/setting.types'
import { ObsidianButton } from '../../common/ObsidianButton'
import { ObsidianSetting } from '../../common/ObsidianSetting'

type EtcSectionProps = {
  app: App
  plugin: SmartComposerPlugin
}

export function EtcSection({ app }: EtcSectionProps) {
  const { setSettings } = useSettings()

  const handleResetSettings = () => {
    new ConfirmModal(
      app,
      'Reset settings',
      'Are you sure you want to reset all settings to default values? This cannot be undone.',
      async () => {
        const defaultSettings = smartComposerSettingsSchema.parse({})
        await setSettings(defaultSettings)
        new Notice('Settings have been reset to defaults')
      },
    ).open()
  }

  return (
    <div className="smtcmp-settings-section">
      <div className="smtcmp-settings-header">Etc</div>

      <ObsidianSetting
        name="Reset settings"
        desc="Reset all settings to default values"
      >
        <ObsidianButton text="Reset" warning onClick={handleResetSettings} />
      </ObsidianSetting>
    </div>
  )
}
