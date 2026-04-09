import { FileText, CheckCircle2, Clock, TrendingUp } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { DashboardStats, DocumentFilters } from '@/types'

interface StatsCardsProps {
  stats: DashboardStats | null
  loading: boolean
  activeFilter?: string | null
  onFilter?: (filters: DocumentFilters, key: string) => void
}

const CARDS = [
  {
    key: 'total',
    label: 'Total Documents',
    icon: FileText,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/40',
    ring: 'ring-blue-500/30',
    filter: {} as DocumentFilters,
  },
  {
    key: 'reviewed',
    label: 'Reviewed',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/40',
    ring: 'ring-emerald-500/30',
    filter: { reviewed: true } as DocumentFilters,
  },
  {
    key: 'unreviewed',
    label: 'Awaiting Review',
    icon: Clock,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/40',
    ring: 'ring-amber-500/30',
    filter: { reviewed: false } as DocumentFilters,
  },
  {
    key: 'high_relevance',
    label: 'High Relevance',
    icon: TrendingUp,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/40',
    ring: 'ring-red-500/30',
    filter: { min_relevance: 0.75 } as DocumentFilters,
  },
] as const

export default function StatsCards({ stats, loading, activeFilter, onFilter }: StatsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-3 mb-5">
        {CARDS.map((c) => (
          <Skeleton key={c.key} className="h-20 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-4 gap-3 mb-5">
      {CARDS.map(({ key, label, icon: Icon, color, bg, border, ring, filter }) => {
        const isActive = activeFilter === key
        return (
          <button
            key={key}
            onClick={() => onFilter?.(filter, key)}
            className={cn(
              'bg-slate-900 border rounded-xl p-4 flex items-center gap-3 w-full text-left transition-all duration-150 cursor-pointer focus:outline-none',
              isActive
                ? `border ${border} ring-2 ${ring} bg-slate-800/60`
                : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
            )}
          >
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', bg)}>
              <Icon className={color} size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white leading-none">
                {stats ? stats[key] : '—'}
              </div>
              <div className={cn('text-xs mt-0.5', isActive ? color : 'text-slate-500')}>{label}</div>
            </div>
            {isActive && (
              <div className={cn('ml-auto w-1.5 h-1.5 rounded-full shrink-0', color.replace('text-', 'bg-'))} />
            )}
          </button>
        )
      })}
    </div>
  )
}
