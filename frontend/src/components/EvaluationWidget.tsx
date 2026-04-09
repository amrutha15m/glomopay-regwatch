import { BarChart3 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { EvaluationMetrics } from '@/types'

interface EvaluationWidgetProps {
  metrics: EvaluationMetrics | null
  loading: boolean
}

function Bar({ pct }: { pct: number }) {
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  )
}

const METRICS = [
  { key: 'pct_summary_helpful', label: 'Summary helpful' },
  { key: 'pct_relevance_correct', label: 'Relevance correct' },
  { key: 'pct_tags_correct', label: 'Tags accurate' },
  { key: 'pct_action_items_useful', label: 'Action items useful' },
] as const

export default function EvaluationWidget({ metrics, loading }: EvaluationWidgetProps) {
  if (loading) return <Skeleton className="h-32 rounded-xl" />

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-300">AI Quality Metrics</span>
        </div>
        {metrics && (
          <span className="text-xs text-slate-500">{metrics.total_feedback} responses</span>
        )}
      </div>

      {!metrics || metrics.total_feedback === 0 ? (
        <p className="text-xs text-slate-600 text-center py-2">No feedback collected yet.</p>
      ) : (
        <div className="space-y-3">
          {METRICS.map(({ key, label }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">{label}</span>
                <span className="text-xs font-semibold text-slate-300">{metrics[key]}%</span>
              </div>
              <Bar pct={metrics[key]} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
