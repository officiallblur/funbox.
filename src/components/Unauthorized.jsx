import React from 'react'
import { useNavigate } from 'react-router-dom'

const Unauthorized = ({ from }) => {
  const navigate = useNavigate()

  const handleLogin = () => {
    // send user to login and preserve original location
    navigate('/login', { state: { from } })
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>You're not signed in</h2>
      <p>You need to sign in to access this page.</p>
      <div style={{ marginTop: 12 }}>
        <button onClick={handleLogin}>Sign in</button>
      </div>
    </div>
  )
}

export default Unauthorized
