import axios from 'axios'
import type {
  Document, DocumentFilters, Feedback,
  EvaluationMetrics, DashboardStats,
  IngestionRun, IngestionStatus,
} from '@/types'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

export const fetchDocuments = async (filters: DocumentFilters = {}): Promise<Document[]> => {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== '' && v !== null)
  )
  const { data } = await api.get('/documents', { params })
  return data
}

export const fetchDocument = async (id: number): Promise<Document> => {
  const { data } = await api.get(`/documents/${id}`)
  return data
}

export const toggleReviewed = async (id: number): Promise<{ id: number; reviewed: boolean }> => {
  const { data } = await api.patch(`/documents/${id}/reviewed`)
  return data
}

export const clearChat = async (id: number) => {
  await api.delete(`/documents/${id}/chat`)
}

export const askQuestion = async (id: number, question: string) => {
  const { data } = await api.post(`/documents/${id}/question`, { question })
  return data as { answer: string; citations: any[] }
}

export const fetchStats = async (): Promise<DashboardStats> => {
  const { data } = await api.get('/documents/stats')
  return data
}

export const uploadDocument = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await axios.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data as { document_id: number; title: string; ingestion_status: string; message: string }
}

export const submitFeedback = async (documentId: number, feedback: Feedback) => {
  const { data } = await api.post(`/documents/${documentId}/feedback`, feedback)
  return data
}

export const fetchEvaluation = async (): Promise<EvaluationMetrics> => {
  const { data } = await api.get('/evaluation')
  return data
}

export const triggerIngestion = async (source?: string) => {
  if (source) {
    const { data } = await api.post(`/ingestion/trigger/${source}`)
    return data
  }
  const { data } = await api.post('/ingestion/trigger')
  return data
}

export const fetchIngestionHistory = async (): Promise<IngestionRun[]> => {
  const { data } = await api.get('/ingestion/history')
  return data
}

export const fetchIngestionStatus = async (): Promise<IngestionStatus[]> => {
  const { data } = await api.get('/ingestion/status')
  return data
}

export const reprocessAll = async () => {
  const { data } = await api.post('/ingestion/reprocess')
  return data
}

export const reprocessDocument = async (id: number) => {
  const { data } = await api.post(`/documents/${id}/reprocess`)
  return data
}
