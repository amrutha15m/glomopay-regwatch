import { Routes, Route } from 'react-router-dom'
import DashboardPage from '@/pages/DashboardPage'
import DocumentPage from '@/pages/DocumentPage'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/document/:id" element={<DocumentPage />} />
      </Routes>
    </div>
  )
}
