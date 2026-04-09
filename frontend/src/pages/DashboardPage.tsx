import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText } from 'lucide-react'
import Layout from '@/components/Layout'
import StatsCards from '@/components/StatsCards'
import IngestionStatusWidget from '@/components/IngestionStatus'
import FilterPanel from '@/components/FilterPanel'
import DocumentCard from '@/components/DocumentCard'
import UploadModal from '@/components/UploadModal'
import { Skeleton } from '@/components/ui/skeleton'
import {
  fetchDocuments, fetchStats, fetchIngestionStatus,
  fetchIngestionHistory, triggerIngestion, toggleReviewed, reprocessAll,
} from '@/api/client'

import type { Document, DashboardStats, IngestionStatus, IngestionRun, DocumentFilters } from '@/types'

function sortByRelevance(docs: Document[]): Document[] {
  return [...docs].sort((a, b) => (b.relevance_score ?? -1) - (a.relevance_score ?? -1))
}

export default function DashboardPage() {
  const navigate = useNavigate()

  const [documents, setDocuments] = useState<Document[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [ingestionStatuses, setIngestionStatuses] = useState<IngestionStatus[]>([])
  const [_ingestionHistory, setIngestionHistory] = useState<IngestionRun[]>([])
  const [filters, setFilters] = useState<DocumentFilters>({})
  const [activeCardFilter, setActiveCardFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [showUpload, setShowUpload] = useState(false)

  const loadDocuments = useCallback(async (f: DocumentFilters) => {
    try {
      const docs = await fetchDocuments(f)
      setDocuments(sortByRelevance(docs))
    } catch (e) {
      console.error('Failed to load documents', e)
    }
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [docs, statsData, statuses, history] = await Promise.all([
        fetchDocuments(filters),
        fetchStats(),
        fetchIngestionStatus(),
        fetchIngestionHistory(),
      ])
      setDocuments(sortByRelevance(docs))
      setStats(statsData)
      setIngestionStatuses(statuses)
      setIngestionHistory(history)
    } catch (e) {
      console.error('Failed to load dashboard data', e)
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line

  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    if (!loading) loadDocuments(filters)
  }, [filters, loading, loadDocuments])

  const handleFilterChange = (f: DocumentFilters) => {
    // If user manually changes filters, clear the active card highlight
    // unless this was triggered by a card click (handled separately)
    setFilters(f)
    if (!f.reviewed && !f.min_relevance) setActiveCardFilter(null)
  }

  const handleCardFilter = (cardFilters: DocumentFilters, cardKey: string) => {
    // Toggle: clicking the same card again clears the filter
    if (activeCardFilter === cardKey) {
      setFilters({})
      setActiveCardFilter(null)
    } else {
      setFilters(cardFilters)
      setActiveCardFilter(cardKey)
    }
  }

  const handleFetch = async (source?: string) => {
    setIsFetching(true)
    try {
      await triggerIngestion(source)
      await reprocessAll()
      setTimeout(() => {
        loadAll()
        setIsFetching(false)
      }, 8000)
    } catch (e) {
      console.error('Ingestion trigger failed', e)
      setIsFetching(false)
    }
  }

  const handleToggleReviewed = async (id: number) => {
    try {
      const result = await toggleReviewed(id)
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, reviewed: result.reviewed } : d))
      )
      if (stats) {
        const diff = result.reviewed ? 1 : -1
        setStats({ ...stats, reviewed: stats.reviewed + diff, unreviewed: stats.unreviewed - diff })
      }
    } catch (e) {
      console.error('Failed to toggle reviewed', e)
    }
  }

  const handleUploadSuccess = (docId: number) => {
    setShowUpload(false)
    loadAll()
    navigate(`/document/${docId}`)
  }

  return (
    <Layout
      onFetchLatest={() => handleFetch()}
      onUpload={() => setShowUpload(true)}
      isFetching={isFetching}
    >
      <div className="max-w-[1400px] mx-auto p-6 overflow-y-auto h-[calc(100vh-3.5rem)]">
        {/* Stats cards — clickable quick filters */}
        <StatsCards
          stats={stats}
          loading={loading}
          activeFilter={activeCardFilter}
          onFilter={handleCardFilter}
        />

        <IngestionStatusWidget
          statuses={ingestionStatuses}
          isFetching={isFetching}
          onFetch={handleFetch}
        />

        {/* Horizontal filter bar */}
        <FilterPanel
          filters={filters}
          onChange={handleFilterChange}
        />

        {/* Feed header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-400">
            {loading
              ? 'Loading...'
              : `${documents.length} document${documents.length !== 1 ? 's' : ''}${activeCardFilter ? ' (filtered)' : ''}`
            }
          </span>
          {!loading && documents.length > 0 && (
            <span className="text-xs text-slate-600">Sorted by relevance</span>
          )}
        </div>

        {/* Document list */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="w-10 h-10 text-slate-700 mb-3" />
            <p className="text-sm font-medium text-slate-500">No documents found</p>
            <p className="text-xs text-slate-600 mt-1">
              Try adjusting filters or click "Fetch Latest" to pull from live sources.
            </p>
          </div>
        ) : (
          <div>
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onClick={() => navigate(`/document/${doc.id}`)}
                onToggleReviewed={handleToggleReviewed}
              />
            ))}
          </div>
        )}
      </div>

      <UploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onSuccess={handleUploadSuccess}
      />
    </Layout>
  )
}
