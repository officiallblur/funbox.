import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

const Admin = () => {
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [links, setLinks] = useState([])
  const [loadingLinks, setLoadingLinks] = useState(true)
  const [message, setMessage] = useState(null)
  const navigate = useNavigate()

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  const fetchUsers = async () => {
    setLoadingUsers(true)
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false })
    if (error) {
      console.error(error)
      showMsg('Failed loading users', 'error')
    } else setUsers(data || [])
    setLoadingUsers(false)
  }

  const fetchLinks = async () => {
    setLoadingLinks(true)
    const { data, error } = await supabase.from('download_links').select('*').order('created_at', { ascending: false })
    if (error) {
      console.error(error)
      showMsg('Failed loading links', 'error')
    } else setLinks(data || [])
    setLoadingLinks(false)
  }

  useEffect(() => { fetchUsers(); fetchLinks(); }, [])

  // TMDB search state (used to help admins pick movie/show IDs)
  const [tmdbQuery, setTmdbQuery] = useState('')
  const [tmdbResults, setTmdbResults] = useState([])
  const [tmdbLoading, setTmdbLoading] = useState(false)
  const [selectedTmdb, setSelectedTmdb] = useState(null)
  const tmdbTimer = useRef(null)

  const searchTmdb = async (q) => {
    if (!q || q.trim().length < 2) {
      setTmdbResults([])
      return
    }
    setTmdbLoading(true)
    // Try proxy first (/api/tmdb/search). If not available, fall back to direct TMDB call.
    try {
      const proxyResp = await fetch(`/api/tmdb/search?query=${encodeURIComponent(q)}`)
      if (proxyResp.ok) {
        const json = await proxyResp.json()
        setTmdbResults(json.results || [])
        setTmdbLoading(false)
        return
      }
    } catch (e) {
      // proxy not running or blocked; fallback below
    }

    // fallback direct call using TMDB key (dev convenience)
    try {
      const API_KEY = 'ce1a0db13c99a45fd7effb86ab82f78f'
      const API_URL = 'https://api.themoviedb.org/3'
      const r = await fetch(`${API_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(q)}&language=en-US&page=1`)
      const json = await r.json()
      setTmdbResults(json.results || [])
    } catch (e) {
      console.error('TMDB search failed', e)
      setTmdbResults([])
    }
    setTmdbLoading(false)
  }

  const onTmdbChange = (val) => {
    setTmdbQuery(val)
    if (tmdbTimer.current) clearTimeout(tmdbTimer.current)
    tmdbTimer.current = setTimeout(() => searchTmdb(val), 380)
  }

  const toggleRole = async (id, newRole) => {
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', id)
    if (error) {
      console.error(error)
      showMsg('Failed to update role', 'error')
      return
    }

    // keep public.admins helper table in sync so RLS policies that check it work
    try {
      if (newRole === 'admin') {
        await supabase.from('admins').upsert({ user_id: id })
      } else {
        await supabase.from('admins').delete().eq('user_id', id)
      }
    } catch (e) {
      // non-fatal: table may not exist yet; log and continue
      console.warn('Could not sync public.admins:', e)
    }

    showMsg('Role updated')
    fetchUsers()
  }

  const deleteUserRow = async (id) => {
    if (!confirm('Delete this user profile row? This does not delete the auth account.')) return
    const { error } = await supabase.from('users').delete().eq('id', id)
    if (error) {
      console.error(error)
      showMsg('Failed to delete user', 'error')
    } else {
      showMsg('User profile deleted')
      fetchUsers()
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="app" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate(-1)}>← Back</button>
          <button onClick={handleSignOut}>Sign out</button>
        </div>
      </div>

      {message && (
        <div style={{ padding: 10, marginBottom: 12, borderRadius: 6, background: message.type === 'success' ? '#2d6a4f' : '#7f1d1d', color: '#fff' }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 20, maxWidth: 1200 }}>
        <div>
          <section style={cardStyle}>
            <h2 style={h2Style}>Users</h2>
            {loadingUsers ? <p>Loading users...</p> : (
              <div style={{ display: 'grid', gap: 10 }}>
                {users.map(u => (
                  <UserRow key={u.id} user={u} onToggleRole={toggleRole} onDelete={deleteUserRow} />
                ))}
                {users.length === 0 && <p>No users found.</p>}
              </div>
            )}
          </section>

          <section style={{ ...cardStyle, marginTop: 16 }}>
            <h2 style={h2Style}>Admin Actions</h2>
            <p style={{ marginTop: 8 }}>Quick tools for admins. To create an auth user (with password) use the Supabase Console or the Admin API with the service role key.</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={() => { navigator.clipboard?.writeText('admin@example.com'); showMsg('Copied admin email to clipboard') }}>Copy admin email</button>
              <button onClick={() => { navigator.clipboard?.writeText('Admin@123'); showMsg('Copied admin password to clipboard') }}>Copy admin password</button>
            </div>
          </section>
        </div>

        <div>
          <section style={cardStyle}>
            <h2 style={h2Style}>TMDB Search</h2>
            <div style={{ display: 'grid', gap: 8 }}>
              <input placeholder="Search movies or TV (TMDB)" value={tmdbQuery} onChange={(e) => onTmdbChange(e.target.value)} style={inputStyle} />
              {tmdbLoading && <div style={{ color: '#9fb0c8' }}>Searching...</div>}
              {!tmdbLoading && tmdbResults.length > 0 && (
                <div style={{ maxHeight: 280, overflow: 'auto', display: 'grid', gap: 8 }}>
                  {tmdbResults.map(r => (
                    <div key={`${r.media_type}-${r.id}`} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 8, background: '#071121', borderRadius: 6 }}>
                      <img src={r.poster_path ? `https://image.tmdb.org/t/p/w92${r.poster_path}` : ''} alt="" style={{ width: 48, height: 72, objectFit: 'cover', borderRadius: 4 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{r.title || r.name}</div>
                        <div style={{ fontSize: 12, color: '#9fb0c8' }}>{r.media_type} • {r.release_date || r.first_air_date || ''}</div>
                      </div>
                      <div>
                        <button onClick={() => { setSelectedTmdb({ id: r.id, type: r.media_type, title: r.title || r.name }); showMsg('Selected: ' + (r.title || r.name)) }}>Select</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {(!tmdbLoading && tmdbResults.length === 0 && tmdbQuery.trim().length >= 2) && <div style={{ color: '#9fb0c8' }}>No results</div>}
            </div>
            <h2 style={{ ...h2Style, marginTop: 12 }}>Download Links (All)</h2>
            <NewLinkForm onAdded={() => fetchLinks()} showMsg={showMsg} selectedTmdb={selectedTmdb} />
            {loadingLinks ? <p>Loading links...</p> : (
              <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                {links.map(l => (
                  <AdminLinkRow key={l.id} link={l} onSaved={fetchLinks} onDeleted={fetchLinks} />
                ))}
                {links.length === 0 && <p>No links found.</p>}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

const cardStyle = {
  background: '#0f1720', padding: 14, borderRadius: 8, color: '#e6eef8'
}
const h2Style = { margin: 0, marginBottom: 8 }
const inputStyle = { padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', background: '#071021', color: '#e6eef8' }
const primaryButtonStyle = { padding: '8px 12px', borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }

const UserRow = ({ user, onToggleRole, onDelete }) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, background: '#0b1420', borderRadius: 6 }}>
      <div>
        <div style={{ fontWeight: 600 }}>{user.email || user.id}</div>
        <div style={{ fontSize: 12, color: '#9fb0c8' }}>{user.role} • {new Date(user.created_at).toLocaleString()}</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onToggleRole(user.id, user.role === 'admin' ? 'user' : 'admin')}>{user.role === 'admin' ? 'Revoke admin' : 'Make admin'}</button>
        <button onClick={() => onDelete(user.id)} style={{ background: 'transparent' }}>Delete</button>
      </div>
    </div>
  )
}

const NewLinkForm = ({ onAdded, showMsg, selectedTmdb }) => {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [movieId, setMovieId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedTmdb) {
      if (selectedTmdb.title) setTitle(selectedTmdb.title)
      if (selectedTmdb.id) setMovieId(String(selectedTmdb.id))
    }
  }, [selectedTmdb])

  const add = async () => {
    if (!title.trim() || !url.trim()) return
    setLoading(true)
    const payload = { title: title.trim(), url: url.trim() }
    if (movieId.trim()) payload.movie_id = Number(movieId)
    const { data, error } = await supabase.from('download_links').insert([payload]).select()
    setLoading(false)
    if (error) {
      console.error(error)
      showMsg?.('Failed to add link: ' + (error.message || error), 'error')
    } else {
      setTitle(''); setUrl(''); setMovieId('')
      showMsg?.('Link added')
      onAdded()
    }
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <input className="admin-input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
      <input className="admin-input" placeholder="URL" value={url} onChange={(e) => setUrl(e.target.value)} style={inputStyle} />
      <input className="admin-input" placeholder="movie_id (optional)" value={movieId} onChange={(e) => setMovieId(e.target.value)} style={inputStyle} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={add} disabled={loading} style={primaryButtonStyle}>{loading ? 'Adding...' : 'Add link'}</button>
      </div>
    </div>
  )
}

const AdminLinkRow = ({ link, onSaved, onDeleted }) => {
  const [title, setTitle] = useState(link.title || '')
  const [url, setUrl] = useState(link.url || '')
  const [movieId, setMovieId] = useState(link.movie_id || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const { error } = await supabase.from('download_links').update({ title, url, movie_id: movieId || null }).eq('id', link.id)
    setSaving(false)
    if (error) console.error(error)
    else onSaved()
  }

  const remove = async () => {
    if (!confirm('Delete this download link?')) return
    const { error } = await supabase.from('download_links').delete().eq('id', link.id)
    if (error) console.error(error)
    else onDeleted()
  }

  return (
    <div style={{ display: 'grid', gap: 8, padding: 8, background: '#071121', borderRadius: 6 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ flex: 1 }} />
        <input value={url} onChange={(e) => setUrl(e.target.value)} style={{ flex: 1 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input value={movieId} onChange={(e) => setMovieId(e.target.value)} placeholder="movie_id" style={{ width: 120 }} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          <button onClick={remove} style={{ background: 'transparent' }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

export default Admin
