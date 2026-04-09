import { useState, useRef, useEffect } from 'react'
import { Send, MessageCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import CitationChip from '@/components/CitationChip'
import { askQuestion } from '@/api/client'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/types'

interface QAPanelProps {
  documentId: number
  initialMessages: ChatMessage[]
  embedded?: boolean
}

export default function QAPanel({ documentId, initialMessages, embedded }: QAPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const question = input.trim()
    setInput('')
    setLoading(true)

    const userMsg: ChatMessage = {
      id: Date.now(),
      role: 'user',
      message: question,
      citations: [],
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])

    try {
      const result = await askQuestion(documentId, question)
      const assistantMsg: ChatMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        message: result.answer,
        citations: result.citations ?? [],
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (e) {
      const errMsg: ChatMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        message: 'Sorry, something went wrong. Please try again.',
        citations: [],
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={cn(
      "flex flex-col h-full overflow-hidden",
      !embedded && "bg-slate-900 border border-slate-800 rounded-xl"
    )}>
      {/* Header — hidden when embedded (drawer provides its own header) */}
      {!embedded && (
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 shrink-0">
        <MessageCircle className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium text-slate-300">Ask About This Circular</span>
      </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <MessageCircle className="w-8 h-8 text-slate-700 mb-3" />
            <p className="text-sm text-slate-500 font-medium">No questions yet</p>
            <p className="text-xs text-slate-600 mt-1 max-w-[220px]">
              Ask anything about this circular. Answers include exact citations.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}
              >
                <div className={cn("max-w-[88%]", msg.role === 'user' ? "items-end" : "items-start")}>
                  <div
                    className={cn(
                      "rounded-xl px-3 py-2 text-xs leading-relaxed",
                      msg.role === 'user'
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-slate-800 text-slate-200 rounded-bl-sm"
                    )}
                  >
                    {msg.message}
                  </div>

                  {msg.role === 'assistant' && msg.citations.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5 px-1">
                      {msg.citations.map((c, i) => (
                        <CitationChip key={i} citation={c} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 rounded-xl rounded-bl-sm px-3 py-2">
                  <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-slate-800 p-3 shrink-0">
        <div className="flex gap-2">
          <Textarea
            placeholder="Ask a question about this circular... (Enter to send)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            rows={2}
            className="flex-1 text-xs bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-600 resize-none min-h-0"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="h-full w-9 bg-blue-600 hover:bg-blue-500 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
