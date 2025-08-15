import { App, TFile } from 'obsidian'

import { ReactModal } from '../../common/ReactModal'

type ExcludedFilesModalComponentProps = {
  files: TFile[]
}

export class ExcludedFilesModal extends ReactModal<ExcludedFilesModalComponentProps> {
  constructor(app: App, files: TFile[]) {
    super({
      app: app,
      Component: ExcludedFilesModalComponent,
      props: { files },
      options: {
        title: `${files.length} Files Excluded`,
      },
    })
  }
}

function ExcludedFilesModalComponent({
  files,
}: ExcludedFilesModalComponentProps) {
  return files.length === 0 ? (
    <div>No files match the exclusion patterns</div>
  ) : (
    <ul>
      {files.map((file) => (
        <li key={file.path}>{file.path}</li>
      ))}
    </ul>
  )
}
