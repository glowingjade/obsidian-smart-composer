import { App, TFile } from 'obsidian'

import { ReactModal } from '../../common/ReactModal'

type IncludedFilesModalComponentProps = {
  files: TFile[]
  patterns: string[]
}

export class IncludedFilesModal extends ReactModal<IncludedFilesModalComponentProps> {
  constructor(app: App, files: TFile[], patterns: string[]) {
    super({
      app: app,
      Component: IncludedFilesModalComponent,
      props: { files, patterns },
      options: {
        title: `${files.length} Files Included`,
      },
    })
  }
}

function IncludedFilesModalComponent({
  files,
  patterns,
}: IncludedFilesModalComponentProps) {
  return patterns.length === 0 ? (
    <div>
      No inclusion patterns specified - all files will be included (except those
      matching exclusion patterns)
    </div>
  ) : files.length === 0 ? (
    <div>No files match the inclusion patterns</div>
  ) : (
    <ul>
      {files.map((file) => (
        <li key={file.path}>{file.path}</li>
      ))}
    </ul>
  )
}
