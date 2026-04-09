import { useState } from 'react'
import { MessageSquare, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { submitFeedback } from '@/api/client'
import { cn } from '@/lib/utils'
import type { Feedback } from '@/types'

interface FeedbackWidgetProps {
  documentId: number
}

type RelevanceFeedback = 'correct' | 'too_high' | 'too_low'

function TogglePair({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean | null | undefined
  onChange: (v: boolean) => void
}) {
  return (
    <div>
      <div className="text-xs text-slate-400 mb-1.5">{label}</div>
      <div className="flex gap-1.5">
        {(['Yes', 'No'] as const).map((opt) => {
          const isYes = opt === 'Yes'
          const active = value === isYes
          return (
            <button
              key={opt}
              onClick={() => onChange(isYes)}
              className={cn(
                "px-3 py-1 text-xs rounded-md border transition-colors cursor-pointer",
                active
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
              )}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function FeedbackWidget({ documentId }: FeedbackWidgetProps) {
  const [feedback, setFeedback] = useState<Feedback>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const set = (partial: Partial<Feedback>) => setFeedback((f) => ({ ...f, ...partial }))

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await submitFeedback(documentId, feedback)
      setSubmitted(true)
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-sm font-medium">Feedback recorded. Thank you!</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-medium text-slate-300">Analyst Feedback</span>
      </div>

      <div className="space-y-4">
        <TogglePair
          label="Was the summary helpful?"
          value={feedback.summary_helpful}
          onChange={(v) => set({ summary_helpful: v })}
        />

        <div>
          <div className="text-xs text-slate-400 mb-1.5">Is the relevance score correct?</div>
          <div className="flex gap-1.5">
            {([
              { v: 'correct', label: 'Correct' },
              { v: 'too_high', label: 'Too High' },
              { v: 'too_low', label: 'Too Low' },
            ] as { v: RelevanceFeedback; label: string }[]).map(({ v, label }) => (
              <button
                key={v}
                onClick={() => set({ relevance_feedback: v })}
                className={cn(
                  "px-3 py-1 text-xs rounded-md border transition-colors cursor-pointer",
                  feedback.relevance_feedback === v
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <TogglePair
          label="Are the tags accurate?"
          value={feedback.tags_correct}
          onChange={(v) => set({ tags_correct: v })}
        />

        <TogglePair
          label="Are the action items useful?"
          value={feedback.action_items_useful}
          onChange={(v) => set({ action_items_useful: v })}
        />

        <div>
          <div className="text-xs text-slate-400 mb-1.5">Additional comments (optional)</div>
          <Textarea
            placeholder="Any other feedback..."
            value={feedback.comment ?? ''}
            onChange={(e) => set({ comment: e.target.value })}
            className="text-xs bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-600 resize-none h-16"
          />
        </div>

        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-500 h-8 text-xs"
        >
          {submitting ? "Submitting..." : "Submit Feedback"}
        </Button>
      </div>
    </div>
  )
}
