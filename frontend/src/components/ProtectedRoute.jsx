import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../store/AuthContext.jsx'

export default function ProtectedRoute() {
  const { status } = useAuth()

  if (status === 'loading') {
    return <div className="placeholder-page">Loading...</div>
  }
  if (status === 'signed-out') {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
