import { useState, useRef, useEffect } from 'react'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { DocumentFilters } from '@/types'

interface FilterPanelProps {
  filters: DocumentFilters
  onChange: (filters: DocumentFilters) => void
}

const hasActiveFilters = (f: DocumentFilters) =>
  !!(f.q || f.source || f.reviewed !== undefined || f.min_relevance || f.date_from || f.date_to)

export default function FilterPanel({ filters, onChange }: FilterPanelProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const set = (partial: Partial<DocumentFilters>) => onChange({ ...filters, ...partial })
  const active = hasActiveFilters(filters)

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  // If a search term is already set, keep search open
  useEffect(() => {
    if (filters.q) setSearchOpen(true)
  }, [filters.q])

  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      {/* Search icon → expandable input */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            if (searchOpen && filters.q) {
              set({ q: undefined })
              setSearchOpen(false)
            } else {
              setSearchOpen((v) => !v)
            }
          }}
          className={cn(
            'w-8 h-8 rounded-lg border flex items-center justify-center transition-all duration-150 cursor-pointer shrink-0',
            searchOpen
              ? 'bg-blue-600/20 border-blue-500/40 text-blue-400'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
          )}
          title={searchOpen ? 'Close search' : 'Search'}
        >
          <Search className="w-3.5 h-3.5" />
        </button>

        <div
          className={cn(
            'overflow-hidden transition-all duration-200',
            searchOpen ? 'w-48 opacity-100' : 'w-0 opacity-0'
          )}
        >
          <Input
            ref={searchRef}
            placeholder="Search docs..."
            value={filters.q ?? ''}
            onChange={(e) => set({ q: e.target.value || undefined })}
            className="h-8 text-xs bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-600 w-full"
          />
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-slate-700" />

      {/* Filters icon label */}
      <div className="flex items-center gap-1.5 text-slate-500">
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span className="text-xs">Filters:</span>
      </div>

      {/* Source */}
      <Select
        value={filters.source ?? 'all'}
        onValueChange={(v) => set({ source: v === 'all' ? undefined : v })}
      >
        <SelectTrigger className={cn(
          'h-8 text-xs border w-[110px]',
          filters.source
            ? 'bg-blue-600/10 border-blue-500/40 text-blue-300'
            : 'bg-slate-800 border-slate-700 text-slate-300'
        )}>
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sources</SelectItem>
          <SelectItem value="IFSCA">IFSCA</SelectItem>
          <SelectItem value="SEBI">SEBI</SelectItem>
          <SelectItem value="Upload">Uploads</SelectItem>
        </SelectContent>
      </Select>

      {/* Review Status */}
      <Select
        value={filters.reviewed === true ? 'reviewed' : filters.reviewed === false ? 'unreviewed' : 'all'}
        onValueChange={(v) => set({ reviewed: v === 'all' ? undefined : v === 'reviewed' })}
      >
        <SelectTrigger className={cn(
          'h-8 text-xs border w-[120px]',
          filters.reviewed !== undefined
            ? 'bg-blue-600/10 border-blue-500/40 text-blue-300'
            : 'bg-slate-800 border-slate-700 text-slate-300'
        )}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="unreviewed">Unreviewed</SelectItem>
          <SelectItem value="reviewed">Reviewed</SelectItem>
        </SelectContent>
      </Select>

      {/* Relevance */}
      <Select
        value={String(filters.min_relevance ?? 'all')}
        onValueChange={(v) => set({ min_relevance: v === 'all' ? undefined : Number(v) })}
      >
        <SelectTrigger className={cn(
          'h-8 text-xs border w-[130px]',
          filters.min_relevance !== undefined
            ? 'bg-blue-600/10 border-blue-500/40 text-blue-300'
            : 'bg-slate-800 border-slate-700 text-slate-300'
        )}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Relevance</SelectItem>
          <SelectItem value="0.75">High (≥ 0.75)</SelectItem>
          <SelectItem value="0.5">Medium (≥ 0.50)</SelectItem>
          <SelectItem value="0.25">Low (≥ 0.25)</SelectItem>
        </SelectContent>
      </Select>

      {/* Date From */}
      <Input
        type="date"
        value={filters.date_from ?? ''}
        onChange={(e) => set({ date_from: e.target.value || undefined })}
        className={cn(
          'h-8 text-xs border w-[130px]',
          filters.date_from
            ? 'bg-blue-600/10 border-blue-500/40 text-blue-300'
            : 'bg-slate-800 border-slate-700 text-slate-300'
        )}
      />

      {/* Date To */}
      <Input
        type="date"
        value={filters.date_to ?? ''}
        onChange={(e) => set({ date_to: e.target.value || undefined })}
        className={cn(
          'h-8 text-xs border w-[130px]',
          filters.date_to
            ? 'bg-blue-600/10 border-blue-500/40 text-blue-300'
            : 'bg-slate-800 border-slate-700 text-slate-300'
        )}
      />

      {/* Clear all */}
      {active && (
        <button
          onClick={() => { onChange({}); setSearchOpen(false) }}
          className="flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-800 border border-slate-700 hover:border-slate-500 transition-colors cursor-pointer"
        >
          <X className="w-3 h-3" /> Clear
        </button>
      )}
    </div>
  )
}
