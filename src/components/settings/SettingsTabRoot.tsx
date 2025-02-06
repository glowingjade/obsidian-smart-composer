import { App } from 'obsidian'
import React from 'react'

import SmartComposerPlugin from '../../main'

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
      <ProvidersSection app={app} plugin={plugin} />
      <ModelsSection app={app} plugin={plugin} />
      <ChatSection />
      <RAGSection app={app} plugin={plugin} />
      <EtcSection app={app} plugin={plugin} />
    </>
  )
}
