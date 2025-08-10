import { App } from 'obsidian'

import { SettingsProvider } from '../../contexts/settings-context'
import SmartComposerPlugin from '../../main'
import { ReactModal } from '../common/ReactModal'
import { McpSection } from '../settings/sections/McpSection'

type McpSectionComponentProps = {
  app: App
  plugin: SmartComposerPlugin
}

export class McpSectionModal extends ReactModal<McpSectionComponentProps> {
  constructor(app: App, plugin: SmartComposerPlugin) {
    super({
      app: app,
      Component: McpSectionComponent,
      props: {
        app,
        plugin,
      },
    })
    this.modalEl.style.width = '720px'
  }
}

function McpSectionComponent({ app, plugin }: McpSectionComponentProps) {
  return (
    <SettingsProvider
      settings={plugin.settings}
      setSettings={(newSettings) => plugin.setSettings(newSettings)}
      addSettingsChangeListener={(listener) =>
        plugin.addSettingsChangeListener(listener)
      }
    >
      <McpSection app={app} plugin={plugin} />
    </SettingsProvider>
  )
}
