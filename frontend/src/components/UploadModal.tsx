import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { uploadDocument } from '@/api/client'
import { cn } from '@/lib/utils'

interface UploadModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (documentId: number) => void
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function UploadModal({ open, onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setFile(null)
    setError(null)
    setSuccess(false)
    setUploading(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFile = (f: File) => {
    setError(null)
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported.')
      return
    }
    if (f.size > 50 * 1024 * 1024) {
      setError('File must be under 50MB.')
      return
    }
    setFile(f)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
  }, [])

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const result = await uploadDocument(file)
      setSuccess(true)
      setTimeout(() => {
        onSuccess(result.document_id)
        handleClose()
      }, 1500)
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Regulatory Document</DialogTitle>
          <DialogDescription>
            Upload a PDF circular or notification to analyze with AI.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            <p className="text-sm font-medium text-slate-200">Document uploaded and queued for analysis!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {!file ? (
              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                  dragging
                    ? "border-blue-500 bg-blue-500/5"
                    : "border-slate-700 hover:border-slate-600 hover:bg-slate-800/30"
                )}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                <p className="text-sm text-slate-400 font-medium">Drop PDF here or click to browse</p>
                <p className="text-xs text-slate-600 mt-1">Max 50MB · PDF only</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl p-4">
                <FileText className="w-8 h-8 text-blue-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{formatBytes(file.size)}</p>
                </div>
                {!uploading && (
                  <button onClick={() => setFile(null)} className="text-slate-500 hover:text-slate-300 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleClose} className="flex-1 text-slate-400 border border-slate-700">
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="flex-1 bg-blue-600 hover:bg-blue-500 gap-2"
              >
                {uploading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</>
                ) : (
                  <><Upload className="w-3.5 h-3.5" /> Upload & Analyze</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
