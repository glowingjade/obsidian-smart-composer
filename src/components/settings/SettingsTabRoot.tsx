import { App } from 'obsidian'

import SmartComposerPlugin from '../../main'
import { ObsidianButton } from '../common/ObsidianButton'
import { ObsidianSetting } from '../common/ObsidianSetting'

import { ChatSection } from './sections/ChatSection'
import { EtcSection } from './sections/EtcSection'
import { ModelsSection } from './sections/ModelsSection'
import { ProvidersSection } from './sections/ProvidersSection'
import { RAGSection } from './sections/RAGSection'

type SettingsTabRootProps = {
  app: App
  plugin: SmartComposerPlugin
}

export function SettingsTabRoot({ app, plugin }: SettingsTabRootProps) {
  return (
    <>
      <ObsidianSetting
        name="Support Smart Composer"
        desc="If you find Smart Composer valuable, consider supporting its development!"
        heading
        className="smtcmp-settings-support-smart-composer"
      >
        <ObsidianButton
          text="Buy Me a Coffee"
          onClick={() =>
            window.open('https://www.buymeacoffee.com/glowingjade', '_blank')
          }
          cta
        />
      </ObsidianSetting>
      <ProvidersSection app={app} plugin={plugin} />
      <ModelsSection app={app} plugin={plugin} />
      <ChatSection />
      <RAGSection app={app} plugin={plugin} />
      <EtcSection app={app} plugin={plugin} />
    </>
  )
}
