
import { App } from 'obsidian'
import React, { useState } from 'react'

import { AppProvider } from '../../contexts/app-context'
import { RAGEngine } from '../../core/rag/ragEngine'
import { SelectEmbedding } from '../../database/schema'
import { QueryProgressState } from '../chat-view/QueryProgress'
import SimilaritySearchResults from '../chat-view/SimilaritySearchResults'
import { ReactModal } from '../common/ReactModal'

type RAGSearchModalProps = {
  app: App
  getRAGEngine: () => Promise<RAGEngine>
  onClose: () => void
}

function RAGSearchModalContent({ app, getRAGEngine }: RAGSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<
    (Omit<SelectEmbedding, 'embedding'> & { similarity: number })[]
  >([])
  const [isSearching, setIsSearching] = useState(false)
  const [queryProgress, setQueryProgress] = useState<QueryProgressState>({
    type: 'idle',
  })

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setSearchResults([])
    setQueryProgress({ type: 'idle' })

    try {
      const ragEngine = await getRAGEngine()
      const results = await ragEngine.processQuery({
        query: searchQuery.trim(),
        onQueryProgressChange: setQueryProgress,
      })
      setSearchResults(results)
    } catch (error) {
      console.error('RAG search failed:', error)
      // TODO: Show error message to user
    } finally {
      setIsSearching(false)
      setQueryProgress({ type: 'idle' })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  const getProgressMessage = () => {
    switch (queryProgress.type) {
      case 'indexing': {
        const { completedChunks, totalChunks } = queryProgress.indexProgress
        return `Indexing documents: ${completedChunks} / ${totalChunks}${
          queryProgress.indexProgress.waitingForRateLimit
            ? ' (waiting for rate limit to reset)'
            : ''
        }`
      }
      case 'querying':
        return 'Searching...'
      case 'querying-done':
        return `Search completed, found ${queryProgress.queryResult.length} results`
      default:
        return ''
    }
  }

  return (
    <AppProvider app={app}>
      <div className="smtcmp-rag-search-modal">
        <div className="smtcmp-rag-search-modal__header">
          <p>Search for relevant documents in the knowledge base through semantic search</p>
        </div>

        <div className="smtcmp-rag-search-modal__search-container">
          <input
            type="text"
            placeholder="Enter search keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="smtcmp-rag-search-modal__search-input"
            autoFocus
          />
          <button
            onClick={handleSearch}
            disabled={!searchQuery.trim() || isSearching}
            className="smtcmp-rag-search-modal__search-button"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {queryProgress.type !== 'idle' && (
          <div className="smtcmp-rag-search-modal__progress">
            {getProgressMessage()}
          </div>
        )}

        <div className="smtcmp-rag-search-modal__results">
          {searchResults.length > 0 ? (
            <SimilaritySearchResults
              similaritySearchResults={searchResults}
              autoOpen={true}
            />
          ) : (
            !isSearching &&
            searchQuery && (
              <div className="smtcmp-rag-search-modal__no-results">
                No results found
              </div>
            )
          )}
        </div>
      </div>
    </AppProvider>
  )
}

export class RAGSearchModal extends ReactModal<RAGSearchModalProps> {
  constructor(app: App, getRAGEngine: () => Promise<RAGEngine>) {
    super({
      app: app,
      Component: RAGSearchModalContent,
      props: {
        app,
        getRAGEngine,
      },
      options: {
        title: 'RAG Document Search',
      },
    })
    this.modalEl.style.width = '720px'
    this.modalEl.style.height = '600px'
  }
}
