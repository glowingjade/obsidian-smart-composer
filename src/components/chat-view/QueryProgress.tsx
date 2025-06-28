// src/components/chat-view/QueryProgress.tsx

import { SelectEmbedding } from '../../database/schema'
import DotLoader from '../common/DotLoader'

export type QueryProgressState =
  | {
      type: 'reading-mentionables'
    }
  | {
      type: 'indexing'
      indexProgress: IndexProgress
    }
  | {
      type: 'querying'
    }
  | {
      type: 'querying-done'
      queryResult: (Omit<SelectEmbedding, 'embedding'> & {
        similarity: number
      })[]
    }
  | {
      type: 'fetching-links' // New state
    }
  | {
      type: 'idle'
    }

export type IndexProgress = {
  completedChunks: number
  totalChunks: number
  totalFiles: number
  waitingForRateLimit?: boolean
}

// TODO: Update style
export default function QueryProgress({
  state,
}: {
  state: QueryProgressState
}) {
  switch (state.type) {
    case 'idle':
      return null
    case 'reading-mentionables':
      return (
        <div className="smtcmp-query-progress">
          <p>
            Reading mentioned files
            <DotLoader />
          </p>
        </div>
      )
    case 'indexing':
      return (
        <div className="smtcmp-query-progress">
          <p>
            {`Indexing ${state.indexProgress.totalFiles} file`}
            <DotLoader />
          </p>
          <p className="smtcmp-query-progress-detail">{`${state.indexProgress.completedChunks}/${state.indexProgress.totalChunks} chunks indexed`}</p>
          {state.indexProgress.waitingForRateLimit && (
            <p className="smtcmp-query-progress-detail">
              Waiting for rate limit to reset...
            </p>
          )}
        </div>
      )
    case 'querying':
      return (
        <div className="smtcmp-query-progress">
          <p>
            Querying the vault
            <DotLoader />
          </p>
        </div>
      )
    case 'querying-done':
      return (
        <div className="smtcmp-query-progress">
          <p>
            Reading related files
            <DotLoader />
          </p>
          {state.queryResult.map((result) => (
            <div key={result.path}>
              <p>{result.path}</p>
              <p>{result.similarity}</p>
            </div>
          ))}
        </div>
      )
    case 'fetching-links': // New case
      return (
        <div className="smtcmp-query-progress">
          <p>
            Fetching linked notes
            <DotLoader />
          </p>
        </div>
      )
  }
}