import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate, useLocation } from 'react-router-dom'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // If user was redirected here by ProtectedRoute, the original location is in state.from
  const from = location.state?.from

  useEffect(() => {
    const session = supabase.auth.getSession().then()
    // noop: keep for possible future use
  }, [])

  const handleSignIn = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      const userId = data.user?.id
      if (userId) {
        const { data: userRow } = await supabase.from('users').select('role').eq('id', userId).single()
        if (from && from.pathname) {
          navigate(from.pathname)
        } else if (userRow?.role === 'admin') {
          navigate('/admin')
        } else {
          navigate('/')
        }
      } else {
        if (from && from.pathname) navigate(from.pathname)
        else navigate('/')
      }
    } catch (err) {
      console.error('Sign-in error', err)
      setError(err?.message || 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app login-page">
      <div className="login-card">
        <h2>Welcome back</h2>
        <div className="login-sub">Sign in to your admin account</div>
        <form onSubmit={handleSignIn}>
          <div className="field">
            <input placeholder=" " value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            <label>Email</label>
          </div>

          <div className="field">
            <input placeholder=" " value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
            <label>Password</label>
          </div>

          <div className="controls">
            <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
            <button type="button" onClick={() => { setEmail('admin@example.com'); setPassword('Admin@123'); }} className="btn-ghost">Fill admin</button>
          </div>

          {error && <div className="error-msg">{error}</div>}
        </form>
      </div>
    </div>
  )
}

export default Login
