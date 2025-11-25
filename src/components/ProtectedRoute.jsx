import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Navigate, useLocation } from 'react-router-dom'
import Unauthorized from './Unauthorized'

const ProtectedRoute = ({ children, requiredRole = 'admin' }) => {
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [sessionUser, setSessionUser] = useState(null)
  const location = useLocation()

  useEffect(() => {
    let mounted = true
    const check = async () => {
      setLoading(true)
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const session = sessionData?.session
        const userId = session?.user?.id
        setSessionUser(session?.user ?? null)
        if (!userId) {
          if (mounted) setAllowed(false)
          return
        }

        const { data: userRow, error } = await supabase.from('users').select('role').eq('id', userId).single()
        if (error) {
          console.error('Error fetching user role', error)
          if (mounted) setAllowed(false)
        } else {
          if (mounted) setAllowed(userRow?.role === requiredRole)
        }
      } catch (err) {
        console.error('ProtectedRoute error', err)
        if (mounted) setAllowed(false)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    check()

    return () => { mounted = false }
  }, [requiredRole])

  if (loading) return <div className="loading">Checking permissions...</div>

  // Not signed in: show a friendly unauthorized page with a CTA to login (preserves the intended path)
  if (!sessionUser) return <Unauthorized from={location} />

  // Signed in but not allowed
  if (!allowed) return (
    <div style={{ padding: 24 }}>
      <h2>Access denied</h2>
      <p>You do not have permission to view this page. Contact an administrator if you believe this is an error.</p>
    </div>
  )

  return children
}

export default ProtectedRoute
