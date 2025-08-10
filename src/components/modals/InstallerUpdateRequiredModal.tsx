import { App } from 'obsidian'

import { ReactModal } from '../common/ReactModal'

export class InstallerUpdateRequiredModal extends ReactModal<
  Record<string, never>
> {
  constructor(app: App) {
    super({
      app: app,
      Component: InstallerUpdateRequiredModalComponent,
      props: {},
      options: {
        title: 'Smart Composer Requires Obsidian Update',
      },
    })
  }
}

function InstallerUpdateRequiredModalComponent() {
  return (
    <div>
      <div>
        Smart Composer requires a newer version of the Obsidian installer.
        Please note that this is different from Obsidian&apos;s in-app updates.
        You must manually download the latest version of Obsidian to continue
        using Smart Composer.
      </div>
      <div>
        <div className="modal-button-container">
          <button
            className="mod-cta"
            onClick={() => {
              window.open('https://obsidian.md/download')
            }}
          >
            Open Download Page
          </button>
        </div>
      </div>
    </div>
  )
}
