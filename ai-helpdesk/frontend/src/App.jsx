import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Sidebar from './components/Sidebar'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ChatPage from './pages/ChatPage'
import MyTicketsPage from './pages/MyTicketsPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminTicketsPage from './pages/AdminTicketsPage'
import AdminDatasetPage from './pages/AdminDatasetPage'
import AdminKnowledgePage from './pages/AdminKnowledgePage'
import ProfilePage from './pages/ProfilePage'

function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-3)', fontSize: 13 }}>
      Loading…
    </div>
  )

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (adminOnly && user.role !== 'ADMIN' && user.role !== 'AGENT') return <Navigate to="/dashboard" replace />
  return children
}

function AppLayout() {
  return (
    <div className="layout">
      <Sidebar />
      <Routes>
        <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/chat"      element={<PrivateRoute><ChatPage /></PrivateRoute>} />
        <Route path="/tickets"   element={<PrivateRoute><MyTicketsPage /></PrivateRoute>} />
        <Route path="/profile"   element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        <Route path="/admin"     element={<PrivateRoute adminOnly><AdminDashboardPage /></PrivateRoute>} />
        <Route path="/admin/tickets" element={<PrivateRoute adminOnly><AdminTicketsPage /></PrivateRoute>} />
        <Route path="/admin/knowledge" element={<PrivateRoute adminOnly><AdminKnowledgePage /></PrivateRoute>} />
        <Route path="/admin/dataset" element={<PrivateRoute adminOnly><AdminDatasetPage /></PrivateRoute>} />
        <Route path="*"          element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/*"        element={<AppLayout />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}
