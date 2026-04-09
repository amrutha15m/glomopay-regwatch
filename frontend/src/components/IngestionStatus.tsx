import { formatDistanceToNow } from 'date-fns'
import { RefreshCw, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { IngestionStatus } from '@/types'

interface IngestionStatusProps {
  statuses: IngestionStatus[]
  isFetching: boolean
  onFetch: (source?: string) => void
}

const STATUS_DOT: Record<string, string> = {
  completed: 'bg-emerald-500',
  running: 'bg-amber-500 animate-pulse',
  failed: 'bg-red-500',
}

export default function IngestionStatusWidget({ statuses, isFetching, onFetch }: IngestionStatusProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-300">Source Status</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onFetch()}
          disabled={isFetching}
          className="h-7 text-xs gap-1.5 text-slate-400 hover:text-white"
        >
          <RefreshCw className={cn("w-3 h-3", isFetching && "animate-spin")} />
          Fetch All
        </Button>
      </div>

      <div className="flex gap-3">
        {statuses.length === 0 ? (
          <span className="text-xs text-slate-500">No ingestion runs yet.</span>
        ) : (
          statuses.map((s) => (
            <div
              key={s.source}
              className="flex items-center gap-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 flex-1"
            >
              <div className={cn("w-2 h-2 rounded-full shrink-0", STATUS_DOT[s.last_status ?? ''] ?? 'bg-slate-600')} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-200">{s.source}</span>
                  {s.new_documents_added != null && s.new_documents_added > 0 && (
                    <span className="text-xs text-emerald-400 font-medium">+{s.new_documents_added}</span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {s.last_run_at
                    ? formatDistanceToNow(new Date(s.last_run_at), { addSuffix: true })
                    : 'Never fetched'}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onFetch(s.source)}
                disabled={isFetching}
                className="h-6 w-6 p-0 text-slate-500 hover:text-blue-400"
              >
                <RefreshCw className={cn("w-3 h-3", isFetching && "animate-spin")} />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
