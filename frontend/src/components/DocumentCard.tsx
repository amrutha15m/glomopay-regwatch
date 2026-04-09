import { format } from 'date-fns'
import { CheckCircle2, Circle, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Document } from '@/types'

interface DocumentCardProps {
  document: Document
  onClick: () => void
  onToggleReviewed: (id: number) => void
}

const SOURCE_VARIANT: Record<string, 'info' | 'purple' | 'muted'> = {
  IFSCA: 'info',
  RBI: 'purple',
}

function relevanceTier(score: number | null | undefined): { label: string; variant: 'warning' | 'info' | 'muted' } {
  if (score == null) return { label: '', variant: 'muted' }
  if (score >= 0.75) return { label: 'High', variant: 'warning' }
  if (score >= 0.5) return { label: 'Medium', variant: 'info' }
  return { label: 'Low', variant: 'muted' }
}

function formatDate(d: string | null) {
  if (!d) return null
  try { return format(new Date(d), 'MMM d, yyyy') } catch { return d }
}

export default function DocumentCard({ document: doc, onClick, onToggleReviewed }: DocumentCardProps) {
  const { label: relLabel, variant: relVariant } = relevanceTier(doc.relevance_score)
  const sourceVariant = SOURCE_VARIANT[doc.source] ?? 'muted'

  return (
    <div
      className={cn(
        "group bg-slate-900 border rounded-xl p-4 mb-2 cursor-pointer transition-all duration-150",
        doc.reviewed
          ? "border-slate-800 hover:border-slate-700"
          : "border-slate-800 hover:border-blue-700/50 hover:bg-slate-800/40"
      )}
      onClick={onClick}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <Badge variant={sourceVariant} className="shrink-0 text-[10px] px-2 py-0">{doc.source}</Badge>
          {doc.reviewed && (
            <Badge variant="success" className="shrink-0 text-[10px] px-2 py-0">Reviewed</Badge>
          )}
          {relLabel && (
            <Badge variant={relVariant} className="shrink-0 text-[10px] px-2 py-0">
              {relLabel} {doc.relevance_score != null ? `· ${doc.relevance_score.toFixed(2)}` : ''}
            </Badge>
          )}
        </div>

        <button
          className={cn(
            "shrink-0 p-1 rounded-md transition-colors cursor-pointer",
            doc.reviewed
              ? "text-emerald-500 hover:text-emerald-400"
              : "text-slate-600 hover:text-slate-400"
          )}
          onClick={(e) => { e.stopPropagation(); onToggleReviewed(doc.id) }}
          title={doc.reviewed ? "Mark unreviewed" : "Mark reviewed"}
        >
          {doc.reviewed
            ? <CheckCircle2 className="w-4 h-4" />
            : <Circle className="w-4 h-4" />
          }
        </button>
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-slate-100 line-clamp-2 mb-1.5 group-hover:text-white transition-colors">
        {doc.title}
      </h3>

      {/* Summary */}
      {doc.summary && (
        <p className="text-xs text-slate-500 line-clamp-2 mb-2">{doc.summary}</p>
      )}

      {/* Bottom row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(doc.tags ?? []).slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
              {tag}
            </span>
          ))}
          {(doc.tags?.length ?? 0) > 3 && (
            <span className="text-[10px] text-slate-600">+{(doc.tags?.length ?? 0) - 3}</span>
          )}
        </div>

        {doc.publication_date && (
          <span className="text-[10px] text-slate-600 shrink-0">
            {formatDate(doc.publication_date)}
          </span>
        )}
      </div>
    </div>
  )
}
