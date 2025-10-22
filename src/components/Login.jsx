import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './Login.css'

/**
 * Login Component
 * - Handles HOD/Admin authentication
 * - Uses Controllers collection for credentials
 * - No JWT yet (testing phase)
 */
function Login() {
  const [credentials, setCredentials] = useState({
    user_name: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    })
    setError('') // Clear error on input change
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await axios.post('/api/auth/login', credentials)
      
      if (response.data.success) {
        // Store user info in localStorage (temporary, will use JWT later)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        localStorage.setItem('isAuthenticated', 'true')
        
        // Navigate to dashboard
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>BIT ISE</h1>
          <h2>Time Table Generator</h2>
          <p>Department of Information Science & Engineering</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="user_name">Username</label>
            <input
              type="text"
              id="user_name"
              name="user_name"
              value={credentials.user_name}
              onChange={handleChange}
              placeholder="Enter username"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="text"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              placeholder="Enter password"
              required
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="login-btn"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p>Test Credentials: HOD / ise@hod</p>
        </div>
      </div>
    </div>
  )
}

export default Login
