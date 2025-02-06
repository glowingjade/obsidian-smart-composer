import { App } from 'obsidian'
import React from 'react'

import SmartComposerPlugin from '../../../main'

import { ChatModelsSubSection } from './models/ChatModelsSubSection'
import { EmbeddingModelsSubSection } from './models/EmbeddingModelsSubSection'

type ModelsSectionProps = {
  app: App
  plugin: SmartComposerPlugin
}

export function ModelsSection({ app, plugin }: ModelsSectionProps) {
  return (
    <div className="smtcmp-settings-section">
      <div className="smtcmp-settings-header">Models</div>
      <ChatModelsSubSection app={app} plugin={plugin} />
      <EmbeddingModelsSubSection app={app} plugin={plugin} />
    </div>
  )
}
