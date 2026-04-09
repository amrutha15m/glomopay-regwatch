import { useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Citation } from '@/types'

interface AnalysisCitationsProps {
  citations: Citation[]
  sourceUrl?: string | null
}

export default function AnalysisCitations({ citations, sourceUrl }: AnalysisCitationsProps) {
  const [open, setOpen] = useState(false)

  if (!citations || citations.length === 0) return null

  const showSourceLink = sourceUrl && !sourceUrl.startsWith('local://')

  return (
    <div className="mt-3 border-t border-slate-800 pt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer group"
      >
        <BookOpen className="w-3.5 h-3.5 text-blue-500/70 group-hover:text-blue-400 transition-colors" />
        <span>
          {open ? 'Hide' : 'View'} {citations.length} source{citations.length !== 1 ? 's' : ''}
        </span>
        {open
          ? <ChevronUp className="w-3 h-3 ml-0.5" />
          : <ChevronDown className="w-3 h-3 ml-0.5" />
        }
      </button>

      {open && (
        <div className="mt-2.5 space-y-2.5">
          {citations.map((c, i) => (
            <div
              key={i}
              className="rounded-lg border border-slate-700/60 bg-slate-800/40 overflow-hidden"
            >
              {/* Citation header */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-800/60 border-b border-slate-700/40">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center text-[10px] font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                    {c.label}
                  </span>
                  {c.page_number != null && (
                    <span className="text-[10px] text-slate-500">Page {c.page_number}</span>
                  )}
                </div>
                {showSourceLink && (
                  <a
                    href={sourceUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3" />
                    View in source
                  </a>
                )}
              </div>

              {/* Chunk text as a blockquote-style excerpt */}
              <div className={cn(
                'px-3 py-2.5 text-xs text-slate-400 leading-relaxed',
                'border-l-2 border-blue-500/40 ml-3 my-2 mr-3 pl-3',
                'italic'
              )}>
                "{c.text.length > 300 ? c.text.slice(0, 300) + '…' : c.text}"
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
