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
  
  // Series scraper modal state
  const [showSeriesScraper, setShowSeriesScraper] = useState(false)

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
            <NewLinkForm onAdded={() => fetchLinks()} showMsg={showMsg} selectedTmdb={selectedTmdb} onOpenSeriesScraper={() => setShowSeriesScraper(true)} />
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

      {/* Series Scraper Modal */}
      {showSeriesScraper && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#0f1720', borderRadius: 8, padding: 24, maxWidth: 600, maxHeight: '80vh', overflow: 'auto', color: '#e6eef8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Scrape Series Episodes (TMDB)</h3>
              <button onClick={() => setShowSeriesScraper(false)} style={{ background: 'transparent', color: '#9fb0c8', border: 'none', fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>
            <SeriesScraperForm onAdded={() => { fetchLinks(); setShowSeriesScraper(false) }} showMsg={showMsg} />
          </div>
        </div>
      )}
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

const NewLinkForm = ({ onAdded, showMsg, selectedTmdb, onOpenSeriesScraper }) => {
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
        <button onClick={onOpenSeriesScraper} style={{ ...primaryButtonStyle, background: '#7c3aed' }}>Scrape Series Episodes</button>
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

const SeriesScraperForm = ({ onAdded, showMsg }) => {
  const [seriesQuery, setSeriesQuery] = useState('')
  const [seriesResults, setSeriesResults] = useState([])
  const [seriesLoading, setSeriesLoading] = useState(false)
  const [selectedSeries, setSelectedSeries] = useState(null)
  const [seriesDetails, setSeriesDetails] = useState(null)
  const [selectedSeason, setSelectedSeason] = useState('')
  const [selectedEpisodes, setSelectedEpisodes] = useState(new Set())
  const [scrapingInProgress, setScrapingInProgress] = useState(false)
  const seriesQueryTimer = useRef(null)

  const searchSeries = async (q) => {
    if (!q || q.trim().length < 2) {
      setSeriesResults([])
      return
    }
    setSeriesLoading(true)
    try {
      const API_KEY = 'ce1a0db13c99a45fd7effb86ab82f78f'
      const r = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(q)}&language=en-US&page=1`)
      const json = await r.json()
      setSeriesResults(json.results || [])
    } catch (e) {
      console.error('TMDB series search failed', e)
      setSeriesResults([])
    }
    setSeriesLoading(false)
  }

  const onSeriesChange = (val) => {
    setSeriesQuery(val)
    if (seriesQueryTimer.current) clearTimeout(seriesQueryTimer.current)
    seriesQueryTimer.current = setTimeout(() => searchSeries(val), 380)
  }

  const selectSeries = async (series) => {
    setSelectedSeries(series)
    setSelectedSeason('')
    setSelectedEpisodes(new Set())
    
    try {
      const API_KEY = 'ce1a0db13c99a45fd7effb86ab82f78f'
      const r = await fetch(`https://api.themoviedb.org/3/tv/${series.id}?api_key=${API_KEY}&language=en-US`)
      const json = await r.json()
      setSeriesDetails(json)
      showMsg?.(`Selected: ${series.name}`)
    } catch (e) {
      console.error('Failed to fetch series details:', e)
      showMsg?.('Failed to load series details', 'error')
    }
  }

  const getEpisodesForSeason = (seasonNumber) => {
    if (!seriesDetails || !seriesDetails.seasons) return 0
    const season = seriesDetails.seasons.find(s => s.season_number === Number(seasonNumber))
    return season ? season.episode_count : 0
  }

  const handleScrapeSeason = async () => {
    if (!selectedSeries || !selectedSeason) {
      showMsg?.('Select a series and season first', 'error')
      return
    }
    if (selectedEpisodes.size === 0) {
      showMsg?.('Select at least one episode', 'error')
      return
    }

    setScrapingInProgress(true)
    const { data: session } = await supabase.auth.getSession()
    const token = session?.session?.access_token
    if (!token) {
      showMsg?.('Authentication required', 'error')
      setScrapingInProgress(false)
      return
    }

    let totalLinksFound = 0
    let successCount = 0
    const season = Number(selectedSeason)
    const episodes = Array.from(selectedEpisodes).sort((a, b) => a - b)

    try {
      for (const ep of episodes) {
        try {
          const resp = await fetch(`/api/scraper/episode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              tvId: selectedSeries.id,
              seriesTitle: selectedSeries.name,
              season,
              episode: ep
            })
          })
          const text = await resp.text()
          let data
          try { data = text ? JSON.parse(text) : {} } catch (e) { data = { _raw: text } }
          if (resp.ok && data && data.success) {
            totalLinksFound += (data.count || 0)
            successCount++
          }
        } catch (e) {
          console.error(`Error scraping S${season}E${ep}:`, e)
        }
      }

      showMsg?.(`✓ Scraped ${successCount}/${episodes.length} episodes, found ${totalLinksFound} link(s)`)
      
      // Reset form
      setSeriesQuery('')
      setSeriesResults([])
      setSelectedSeries(null)
      setSeriesDetails(null)
      setSelectedSeason('')
      setSelectedEpisodes(new Set())
      onAdded()
    } catch (e) {
      console.error('Scrape error:', e)
      showMsg?.('Scrape error: ' + (e.message || e), 'error')
    } finally {
      setScrapingInProgress(false)
    }
  }

  const episodeCount = selectedSeason ? getEpisodesForSeason(selectedSeason) : 0

  return (
    <div style={{ display: 'grid', gap: 12, padding: 14, background: '#0f1720', borderRadius: 8, marginTop: 12 }}>
      {/* Series Search */}
      <div style={{ display: 'grid', gap: 8 }}>
        <label style={{ fontWeight: 600 }}>Search Series</label>
        <input 
          placeholder="Type series name..." 
          value={seriesQuery} 
          onChange={(e) => onSeriesChange(e.target.value)} 
          style={inputStyle}
        />
        {seriesLoading && <div style={{ color: '#9fb0c8', fontSize: 12 }}>Searching...</div>}
        {!seriesLoading && seriesResults.length > 0 && (
          <div style={{ maxHeight: 240, overflow: 'auto', display: 'grid', gap: 6 }}>
            {seriesResults.slice(0, 8).map(r => (
              <div 
                key={r.id} 
                onClick={() => selectSeries(r)}
                style={{ 
                  display: 'flex', 
                  gap: 10, 
                  alignItems: 'center', 
                  padding: '10px 12px', 
                  background: selectedSeries?.id === r.id ? '#1e4620' : '#071121', 
                  borderRadius: 6,
                  border: selectedSeries?.id === r.id ? '1px solid #4ade80' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <img src={r.poster_path ? `https://image.tmdb.org/t/p/w92${r.poster_path}` : 'https://via.placeholder.com/40x60?text=No'} alt="" style={{ width: 40, height: 60, objectFit: 'cover', borderRadius: 4 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: '#9fb0c8' }}>{r.first_air_date ? new Date(r.first_air_date).getFullYear() : 'N/A'}</div>
                </div>
                {selectedSeries?.id === r.id && <span style={{ color: '#4ade80', fontWeight: 700 }}>✓</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Season Selection */}
      {selectedSeries && seriesDetails && (
        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ fontWeight: 600 }}>Select Season</label>
          <select 
            value={selectedSeason} 
            onChange={(e) => {
              setSelectedSeason(e.target.value)
              setSelectedEpisodes(new Set())
            }}
            style={{ ...inputStyle, cursor: 'pointer', padding: '10px 12px' }}
          >
            <option value="">-- Choose Season --</option>
            {seriesDetails.seasons && seriesDetails.seasons.map(s => (
              <option key={s.season_number} value={s.season_number}>
                Season {s.season_number} ({s.episode_count} episodes)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Episode Selection */}
      {selectedSeason && episodeCount > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ fontWeight: 600 }}>Select Episodes (Season {selectedSeason})</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))', gap: 6 }}>
            {Array.from({ length: episodeCount }, (_, i) => i + 1).map(ep => (
              <label 
                key={ep}
                style={{ 
                  display: 'flex', 
                  gap: 6, 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  padding: '8px 10px', 
                  background: selectedEpisodes.has(ep) ? '#1e4620' : '#0b1420', 
                  borderRadius: 6,
                  border: selectedEpisodes.has(ep) ? '1px solid #4ade80' : '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: 12,
                  fontWeight: 500
                }}
              >
                <input 
                  type="checkbox" 
                  checked={selectedEpisodes.has(ep)}
                  onChange={(e) => {
                    const next = new Set(selectedEpisodes)
                    if (e.target.checked) next.add(ep)
                    else next.delete(ep)
                    setSelectedEpisodes(next)
                  }}
                  style={{ cursor: 'pointer' }}
                />
                <span>E{ep}</span>
              </label>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#9fb0c8' }}>Selected: {selectedEpisodes.size} episode(s)</div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button 
          onClick={handleScrapeSeason}
          disabled={!selectedSeries || !selectedSeason || selectedEpisodes.size === 0 || scrapingInProgress}
          style={{ 
            ...primaryButtonStyle, 
            background: scrapingInProgress ? '#4b5563' : '#7c3aed',
            flex: 1,
            minWidth: 120
          }}
        >
          {scrapingInProgress ? 'Scraping...' : `Scrape ${selectedEpisodes.size} Episode(s)`}
        </button>
        <button 
          onClick={() => {
            setSeriesQuery('')
            setSeriesResults([])
            setSelectedSeries(null)
            setSeriesDetails(null)
            setSelectedSeason('')
            setSelectedEpisodes(new Set())
          }}
          style={{ ...primaryButtonStyle, background: 'transparent', color: '#9fb0c8', border: '1px solid rgba(255,255,255,0.2)' }}
        >
          Clear
        </button>
      </div>
    </div>
  )
}

export default Admin
