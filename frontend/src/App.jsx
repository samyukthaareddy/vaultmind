import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AskMemory from './pages/AskMemory'
import Timeline from './pages/Timeline'
import MemoryExplorer from './pages/MemoryExplorer'
import MemoryDetail from './pages/MemoryDetail'
import AuditLog from './pages/AuditLog'
import Admin from './pages/Admin'
import Ingest from './pages/Ingest'
import Intelligence from './pages/Intelligence'
import RiskRadar from './pages/RiskRadar'
import KnowledgeGaps from './pages/KnowledgeGaps'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-vault-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-500 text-sm">Loading…</span>
      </div>
    </div>
  )
  return user ? children : <Navigate to="/login" />
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="ask" element={<AskMemory />} />
              <Route path="timeline" element={<Timeline />} />
              <Route path="memories" element={<MemoryExplorer />} />
              <Route path="memories/:id" element={<MemoryDetail />} />
              <Route path="audit" element={<AuditLog />} />
              <Route path="admin" element={<Admin />} />
              <Route path="ingest" element={<Ingest />} />
              <Route path="intelligence" element={<Intelligence />} />
              <Route path="risk-radar" element={<RiskRadar />} />
              <Route path="gaps" element={<KnowledgeGaps />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
