import { VectorData } from '../../types/vector-db'

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
      queryResult: (Omit<VectorData, 'embedding'> & { similarity: number })[]
    }
  | {
      type: 'idle'
    }

export type IndexProgress = {
  completedChunks: number
  totalChunks: number
  totalFiles: number
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
        <div>
          <p>Reading mentioned files...</p>
        </div>
      )
    case 'indexing':
      return (
        <div>
          <p>Indexing vault...</p>
          <p>{`Indexing ${state.indexProgress.totalFiles} files...`}</p>
          <p>{`${state.indexProgress.completedChunks}/${state.indexProgress.totalChunks} chunks indexed`}</p>
        </div>
      )
    case 'querying':
      return (
        <div>
          <p>Querying vault...</p>
        </div>
      )
    case 'querying-done':
      return (
        <div>
          <p>Reading related files...</p>
          {state.queryResult.map((result) => (
            <div key={result.path}>
              <p>{result.path}</p>
              <p>{result.similarity}</p>
            </div>
          ))}
        </div>
      )
  }
}
