import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, ExternalLink, CheckCircle2, Circle,
  ChevronDown, ChevronUp, BarChart3, MessageCircle,
  FileText, Lightbulb, ListChecks, X, RefreshCw, Trash2
} from 'lucide-react'
import Layout from '@/components/Layout'
import QAPanel from '@/components/QAPanel'
import FeedbackWidget from '@/components/FeedbackWidget'
import EvaluationWidget from '@/components/EvaluationWidget'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import CitationChip from '@/components/CitationChip'
import AnalysisCitations from '@/components/AnalysisCitations'
import { fetchDocument, toggleReviewed, fetchEvaluation, reprocessDocument, clearChat } from '@/api/client'
import { cn } from '@/lib/utils'
import type { Document, EvaluationMetrics, Citation } from '@/types'

const SOURCE_VARIANT: Record<string, 'info' | 'purple' | 'muted'> = {
  IFSCA: 'info',
  RBI: 'purple',
}

function relevanceTier(score?: number | null) {
  if (score == null) return null
  if (score >= 0.75) return { label: 'High Relevance', variant: 'warning' as const, color: 'text-amber-400', bar: 'bg-amber-400' }
  if (score >= 0.5) return { label: 'Medium Relevance', variant: 'info' as const, color: 'text-blue-400', bar: 'bg-blue-400' }
  return { label: 'Low Relevance', variant: 'muted' as const, color: 'text-slate-400', bar: 'bg-slate-500' }
}

const FUNCTION_COLORS: Record<string, string> = {
  compliance: 'info',
  risk: 'warning',
  product: 'purple',
  operations: 'muted',
}

export default function DocumentPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const docId = Number(id)

  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [evaluation, setEvaluation] = useState<EvaluationMetrics | null>(null)
  const [loadingEval, setLoadingEval] = useState(false)
  const [showEval, setShowEval] = useState(false)
  const [chunksExpanded, setChunksExpanded] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatClearTrigger, setChatClearTrigger] = useState(0)
  const [isReloading, setIsReloading] = useState(false)

  const loadDoc = async () => {
    setLoading(true)
    setError(null)
    try {
      const doc = await fetchDocument(docId)
      setDocument(doc)
    } catch {
      setError('Failed to load document. It may not exist.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDoc() }, [docId]) // eslint-disable-line

  const handleReload = async () => {
    setIsReloading(true)
    try {
      await reprocessDocument(docId)
      await loadDoc()
    } catch { /* silent */ } finally {
      setIsReloading(false)
    }
  }

  const handleToggleEval = async () => {
    if (!showEval) {
      setShowEval(true)
      if (!evaluation) {
        setLoadingEval(true)
        try {
          const data = await fetchEvaluation()
          setEvaluation(data)
        } catch { /* silent */ } finally {
          setLoadingEval(false)
        }
      }
    } else {
      setShowEval(false)
    }
  }

  const handleToggleReviewed = async () => {
    if (!document) return
    try {
      const result = await toggleReviewed(document.id)
      setDocument({ ...document, reviewed: result.reviewed })
    } catch { /* silent */ }
  }

  if (loading) {
    return (
      <Layout>
        <div className="max-w-[860px] mx-auto p-6 space-y-4">
          <Skeleton className="h-5 w-36 rounded-lg" />
          <Skeleton className="h-10 w-3/4 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </Layout>
    )
  }

  if (error || !document) {
    return (
      <Layout>
        <div className="max-w-[860px] mx-auto p-6">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
            <p className="text-red-400 text-sm mb-3">{error ?? 'Document not found.'}</p>
            <Button variant="ghost" onClick={() => navigate('/')} className="text-slate-400">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Button>
          </div>
        </div>
      </Layout>
    )
  }

  const analysis = document.analysis
  const chunks = document.chunks ?? []
  const chatMessages = document.chat_messages ?? []
  const tier = relevanceTier(analysis?.relevance_score)
  const msgCount = chatClearTrigger > 0 ? 0 : chatMessages.length

  return (
    <Layout>
      {/* Scrollable page content */}
      <div className="max-w-[860px] mx-auto p-6 pb-24 overflow-y-auto h-[calc(100vh-3.5rem)]">

        {/* Breadcrumb */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </Link>

        {/* Top row: title card + signals card side by side */}
        <div className="flex gap-4 mb-4 items-stretch">

          {/* Left: title + meta */}
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between min-w-0">
            <div>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Badge variant={SOURCE_VARIANT[document.source] ?? 'muted'}>{document.source}</Badge>
                {document.reviewed
                  ? <Badge variant="success">Reviewed</Badge>
                  : <Badge variant="muted">Unreviewed</Badge>
                }
              </div>

              <h1 className="text-lg font-semibold text-white leading-snug mb-3">
                {document.title}
              </h1>

              <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                {document.publication_date && (
                  <span>Published {document.publication_date}</span>
                )}
                {document.source_url && !document.source_url.startsWith('local://') && (
                  <a
                    href={document.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View Source
                  </a>
                )}
              </div>
            </div>

            <div>
              <Separator className="my-3" />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={document.reviewed ? 'secondary' : 'outline'}
                  onClick={handleToggleReviewed}
                  className={cn(
                    'gap-1.5 h-8 text-xs',
                    document.reviewed
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                      : 'border-slate-700 text-slate-400 hover:text-white'
                  )}
                >
                  {document.reviewed
                    ? <><CheckCircle2 className="w-3.5 h-3.5" /> Reviewed</>
                    : <><Circle className="w-3.5 h-3.5" /> Mark Reviewed</>
                  }
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReload}
                  disabled={isReloading}
                  className="gap-1.5 h-8 text-xs border-slate-700 text-slate-400 hover:text-white"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', isReloading && 'animate-spin')} />
                  {isReloading ? 'Reloading...' : 'Reload'}
                </Button>
              </div>
            </div>
          </div>

          {/* Right: relevance + impacted functions + tags */}
          <div className="w-[240px] shrink-0 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
            {tier ? (
              <div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Relevance</div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className={cn('text-3xl font-bold tabular-nums leading-none', tier.color)}>
                    {analysis?.relevance_score.toFixed(2)}
                  </span>
                  <Badge variant={tier.variant} className="text-[10px]">{tier.label}</Badge>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-700', tier.bar)}
                    style={{ width: `${(analysis?.relevance_score ?? 0) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Relevance</div>
                <span className="text-xs text-slate-600">Not scored</span>
              </div>
            )}

            {analysis && analysis.impacted_functions.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Impacted</div>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.impacted_functions.map((fn) => (
                    <Badge key={fn} variant={(FUNCTION_COLORS[fn.toLowerCase()] as any) ?? 'muted'} className="capitalize text-[10px]">
                      {fn}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {analysis && analysis.tags.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Tags</div>
                <div className="flex flex-wrap gap-1">
                  {analysis.tags.slice(0, 5).map((tag) => (
                    <span key={tag} className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                  {analysis.tags.length > 5 && (
                    <span className="text-[10px] text-slate-600">+{analysis.tags.length - 5}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {analysis ? (
          <>
            {/* Summary card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <span className="text-sm font-semibold text-slate-200">Summary</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{analysis.summary}</p>
              <AnalysisCitations
                citations={analysis.summary_citations ?? []}
                sourceUrl={document.source_url}
              />
            </div>

            {/* Why it matters card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <span className="text-sm font-semibold text-slate-200">Why It Matters to GlomoPay</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{analysis.why_it_matters}</p>
              <AnalysisCitations
                citations={analysis.why_it_matters_citations ?? []}
                sourceUrl={document.source_url}
              />
            </div>

            {/* Action items card */}
            {analysis.action_items.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <ListChecks className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <span className="text-sm font-semibold text-slate-200">Action Items</span>
                </div>
                <ul className="space-y-2.5">
                  {analysis.action_items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                      <span className="w-5 h-5 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-[10px] text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-semibold">
                        {i + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-4">
            <p className="text-sm text-slate-500 text-center">AI analysis not yet available for this document.</p>
          </div>
        )}

        {/* Chunks preview */}
        {chunks.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-4">
            <button
              className="w-full flex items-center justify-between p-4 text-sm font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
              onClick={() => setChunksExpanded(!chunksExpanded)}
            >
              <span>Document Chunks ({chunks.length})</span>
              {chunksExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {chunksExpanded && (
              <div className="border-t border-slate-800 divide-y divide-slate-800/50">
                {chunks.slice(0, 5).map((chunk) => (
                  <div key={chunk.id} className="p-4">
                    <div className="mb-1.5">
                      <CitationChip citation={{
                        label: chunk.citation_label,
                        text: chunk.text,
                        chunk_index: chunk.chunk_index,
                        page_number: chunk.page_number,
                      } as Citation} />
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{chunk.text}</p>
                  </div>
                ))}
                {chunks.length > 5 && (
                  <p className="text-xs text-slate-600 text-center py-3">+{chunks.length - 5} more chunks</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Feedback */}
        <div className="mb-4">
          <FeedbackWidget documentId={document.id} />
        </div>

        {/* Evaluation */}
        <div>
          <button
            onClick={handleToggleEval}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer mb-3"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            {showEval ? 'Hide AI Quality Metrics' : 'Show AI Quality Metrics'}
          </button>
          {showEval && <EvaluationWidget metrics={evaluation} loading={loadingEval} />}
        </div>
      </div>

      {/* Floating chat button */}
      <button
        onClick={() => setChatOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-40 flex items-center gap-2 pl-4 pr-5 h-12 rounded-full shadow-lg transition-all duration-200 cursor-pointer',
          'bg-blue-600 hover:bg-blue-500 text-white',
          chatOpen && 'opacity-0 pointer-events-none scale-90'
        )}
      >
        <MessageCircle className="w-4.5 h-4.5" size={18} />
        <span className="text-sm font-medium">Ask AI</span>
        {msgCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-400 text-slate-900 text-[10px] font-bold rounded-full flex items-center justify-center">
            {msgCount}
          </span>
        )}
      </button>

      {/* Chat drawer overlay */}
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-200',
          chatOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setChatOpen(false)}
      />

      {/* Slide-in panel */}
      <div
        className={cn(
          'fixed top-0 right-0 z-50 h-full w-[420px] bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out',
          chatOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-slate-200">Ask About This Circular</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={async () => { await clearChat(document.id); setChatClearTrigger(t => t + 1) }}
              title="Clear conversation"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChatOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Q&A panel fills remaining height */}
        <div className="flex-1 overflow-hidden">
          <QAPanel documentId={document.id} initialMessages={chatMessages} embedded clearTrigger={chatClearTrigger} />
        </div>
      </div>
    </Layout>
  )
}
