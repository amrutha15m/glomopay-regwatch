export interface AIAnalysis {
  id: number
  summary: string
  why_it_matters: string
  impacted_functions: string[]
  action_items: string[]
  tags: string[]
  relevance_score: number
  generated_at: string
  summary_citations: Citation[]
  why_it_matters_citations: Citation[]
}

export interface DocumentChunk {
  id: number
  chunk_index: number
  text: string
  page_number: number | null
  citation_label: string
}

export interface Citation {
  label: string
  text: string
  chunk_index: number
  page_number: number | null
}

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  message: string
  citations: Citation[]
  created_at: string
}

export interface Document {
  id: number
  title: string
  source: string
  publication_date: string | null
  source_url: string
  file_path: string | null
  reviewed: boolean
  ingestion_status: string
  created_at: string
  updated_at?: string
  analysis?: AIAnalysis | null
  chunks?: DocumentChunk[]
  chat_messages?: ChatMessage[]
  // list item extras
  relevance_score?: number | null
  tags?: string[]
  summary?: string | null
}

export interface Feedback {
  summary_helpful?: boolean | null
  relevance_feedback?: 'correct' | 'too_high' | 'too_low' | null
  tags_correct?: boolean | null
  action_items_useful?: boolean | null
  comment?: string
}

export interface IngestionRun {
  id: number
  source: string
  started_at: string
  completed_at: string | null
  status: 'running' | 'completed' | 'failed'
  documents_found: number
  new_documents_added: number
  error_message: string | null
}

export interface IngestionStatus {
  source: string
  last_run_at: string | null
  last_status: string | null
  new_documents_added: number | null
}

export interface EvaluationMetrics {
  total_feedback: number
  pct_summary_helpful: number
  pct_relevance_correct: number
  pct_tags_correct: number
  pct_action_items_useful: number
}

export interface DashboardStats {
  total: number
  reviewed: number
  unreviewed: number
  high_relevance: number
  sources: string[]
}

export interface DocumentFilters {
  source?: string
  date_from?: string
  date_to?: string
  reviewed?: boolean
  min_relevance?: number
  q?: string
}
