import { Navigate } from 'react-router-dom'

/**
 * Protected Route Component
 * - Checks if user is authenticated
 * - Redirects to login if not
 */
function ProtectedRoute({ children }) {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute
