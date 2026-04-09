import { useState } from 'react'
import type { Citation } from '@/types'

interface CitationChipProps {
  citation: Citation
}

export default function CitationChip({ citation }: CitationChipProps) {
  const [hovered, setHovered] = useState(false)
  const preview = citation.text.slice(0, 220) + (citation.text.length > 220 ? '…' : '')

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="inline-flex items-center gap-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] rounded px-2 py-0.5 cursor-help font-mono">
        {citation.label}
      </span>

      {hovered && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-64 bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl pointer-events-none">
          <div className="text-[10px] font-semibold text-blue-400 mb-1">{citation.label}</div>
          <div className="text-xs text-slate-300 leading-relaxed">{preview}</div>
          <div className="absolute top-full left-3 -mt-px border-4 border-transparent border-t-slate-700" />
        </div>
      )}
    </span>
  )
}
