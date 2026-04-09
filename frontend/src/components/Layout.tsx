import { ShieldCheck, RefreshCw, Upload } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children: React.ReactNode
  onFetchLatest?: () => void
  onUpload?: () => void
  isFetching?: boolean
}

export default function Layout({ children, onFetchLatest, onUpload, isFetching }: LayoutProps) {
  const location = useLocation()
  const isDashboard = location.pathname === '/'

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur supports-[backdrop-filter]:bg-slate-950/80">
        <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-white text-base tracking-tight">GlomoPay</span>
              <span className="text-blue-400 text-sm font-medium">RegWatch</span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {isDashboard && onUpload && (
              <Button
                variant="outline"
                size="sm"
                onClick={onUpload}
                className="gap-1.5 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 h-8 text-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload
              </Button>
            )}
            {isDashboard && onFetchLatest && (
              <Button
                size="sm"
                onClick={onFetchLatest}
                disabled={isFetching}
                className={cn(
                  "gap-1.5 h-8 text-xs",
                  isFetching ? "bg-blue-700" : "bg-blue-600 hover:bg-blue-500"
                )}
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
                {isFetching ? "Fetching..." : "Fetch Latest"}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
