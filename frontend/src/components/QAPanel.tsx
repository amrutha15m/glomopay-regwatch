import { useState, useRef, useEffect } from 'react'
import { Send, MessageCircle, Loader2, Trash2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import CitationChip from '@/components/CitationChip'
import { askQuestion, clearChat } from '@/api/client'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/types'

interface QAPanelProps {
  documentId: number
  initialMessages: ChatMessage[]
  embedded?: boolean
  clearTrigger?: number
}

export default function QAPanel({ documentId, initialMessages, embedded, clearTrigger }: QAPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (clearTrigger) setMessages([])
  }, [clearTrigger])

  const handleClear = async () => {
    await clearChat(documentId)
    setMessages([])
  }

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
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-slate-300">Ask About This Circular</span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            title="Clear conversation"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
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
                    {msg.role === 'user' ? msg.message : (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                          em: ({ children }) => <em className="italic text-slate-300">{children}</em>,
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
                          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                          code: ({ children }) => <code className="bg-slate-700 text-blue-300 rounded px-1 py-0.5 font-mono text-[11px]">{children}</code>,
                          pre: ({ children }) => <pre className="bg-slate-700 rounded p-2 my-1.5 overflow-x-auto font-mono text-[11px] text-slate-200">{children}</pre>,
                          a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="text-blue-400 underline hover:text-blue-300">{children}</a>,
                        }}
                      >
                        {msg.message}
                      </ReactMarkdown>
                    )}
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
        <div className="flex gap-2 items-end">
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
            className="h-9 w-9 bg-blue-600 hover:bg-blue-500 shrink-0 flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
