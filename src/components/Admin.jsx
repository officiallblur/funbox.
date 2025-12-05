import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

const Admin = () => {
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [links, setLinks] = useState([])
  const [loadingLinks, setLoadingLinks] = useState(true)
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [message, setMessage] = useState(null)
  const [showBulkMovieForm, setShowBulkMovieForm] = useState(false)
  const [showBulkSeriesForm, setShowBulkSeriesForm] = useState(false)
  const [selectedMovieGroupIds, setSelectedMovieGroupIds] = useState(new Set())
  const [selectedSeriesGroupIds, setSelectedSeriesGroupIds] = useState(new Set())
  const navigate = useNavigate()
  
  // Series management state
  const [seriesLinks, setSeriesLinks] = useState([])
  const [loadingSeriesLinks, setLoadingSeriesLinks] = useState(false)
  const [seriesGroups, setSeriesGroups] = useState([])
  const [selectedSeriesGroup, setSelectedSeriesGroup] = useState(null)
  const [selectedSeriesLinkIds, setSelectedSeriesLinkIds] = useState(new Set())
  const [selectedMovieLinkIds, setSelectedMovieLinkIds] = useState(new Set())
  const [tmdbSeriesQuery, setTmdbSeriesQuery] = useState('')
  const [tmdbSeriesResults, setTmdbSeriesResults] = useState([])
  const [tmdbSeriesLoading, setTmdbSeriesLoading] = useState(false)
  const [selectedTmdbSeries, setSelectedTmdbSeries] = useState(null)
  const [showSeriesScraperModal, setShowSeriesScraperModal] = useState(false)
  const [seriesScraperMode, setSeriesScraperMode] = useState('season') // 'season' or 'manual'
  const [seriesSeason, setSeriesSeason] = useState('')
  const [seriesEpisodes, setSeriesEpisodes] = useState('') // comma-separated for manual
  const [seriesScrapingLoading, setSeriesScrapingLoading] = useState(false)
  const [showMovieScraperModal, setShowMovieScraperModal] = useState(false)
  const [movieScrapingLoading, setMovieScrapingLoading] = useState(false)
  const tmdbSeriesTimer = useRef(null)

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
      setLinks([])
      setLoadingLinks(false)
      return
    }

    const rows = data || []
    setLinks(rows)

    // group by movie_id
    const map = new Map()
    rows.forEach(r => {
      const key = r.movie_id != null ? String(r.movie_id) : `no_movie_${r.id}`
      if (!map.has(key)) map.set(key, { movie_id: r.movie_id, title: r.movie_id ? null : (r.title || 'Unknown'), poster: null, links: [] })
      map.get(key).links.push(r)
    })

    // fetch TMDB metadata for groups with movie_id
    const movieIds = Array.from(map.values()).filter(g => g.movie_id).map(g => g.movie_id)
    if (movieIds.length > 0) {
      try {
        const API_KEY = 'ce1a0db13c99a45fd7effb86ab82f78f'
        const fetches = movieIds.map(id => fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${API_KEY}&language=en-US`).then(r => r.json()).catch(() => null))
        const results = await Promise.all(fetches)
        results.forEach((res, idx) => {
          const id = movieIds[idx]
          const key = String(id)
          if (res && !res.status_code) {
            const g = map.get(key)
            if (g) {
              g.title = res.title || res.name || g.title
              g.poster = res.poster_path ? `https://image.tmdb.org/t/p/w200${res.poster_path}` : null
            }
          }
        })
      } catch (e) {
        console.error('TMDB fetch failed:', e)
      }
    }

    setGroups(Array.from(map.values()))
    setLoadingLinks(false)
  }

  const fetchSeriesLinks = async () => {
    setLoadingSeriesLinks(true)
    const { data, error } = await supabase.from('series_links').select('*').order('created_at', { ascending: false })
    if (error) {
      console.error(error)
      showMsg('Failed loading series links', 'error')
      setSeriesLinks([])
      setSeriesGroups([])
      setLoadingSeriesLinks(false)
      return
    }

    const rows = data || []
    setSeriesLinks(rows)

    // group by tv_id
    const map = new Map()
    rows.forEach(r => {
      const key = r.tv_id != null ? String(r.tv_id) : `no_series_${r.id}`
      // If tv_id exists we'll populate title from TMDB later; otherwise use series_title or the record's title
      const initialTitle = r.tv_id ? null : (r.series_title || r.title || 'Unknown')
      if (!map.has(key)) map.set(key, { tv_id: r.tv_id, title: initialTitle, poster: null, links: [] })
      map.get(key).links.push(r)
    })

    // fetch TMDB metadata for series with tv_id
    const tvIds = Array.from(map.values()).filter(g => g.tv_id).map(g => g.tv_id)
    if (tvIds.length > 0) {
      try {
        const API_KEY = 'ce1a0db13c99a45fd7effb86ab82f78f'
        const fetches = tvIds.map(id => fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${API_KEY}&language=en-US`).then(r => r.json()).catch(() => null))
        const results = await Promise.all(fetches)
        results.forEach((res, idx) => {
          const id = tvIds[idx]
          const key = String(id)
          if (res && !res.status_code) {
            const g = map.get(key)
            if (g) {
              g.title = res.name || g.title
              g.poster = res.poster_path ? `https://image.tmdb.org/t/p/w200${res.poster_path}` : null
            }
          }
        })
      } catch (e) {
        console.error('TMDB fetch failed:', e)
      }
    }

    setSeriesGroups(Array.from(map.values()))
    setLoadingSeriesLinks(false)
  }

  useEffect(() => { fetchUsers(); fetchLinks(); fetchSeriesLinks(); }, [])

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
    try {
      const proxyResp = await fetch(`/api/tmdb/search?query=${encodeURIComponent(q)}&type=movie`)
      if (proxyResp.ok) {
        const json = await proxyResp.json()
        setTmdbResults(json.results || [])
        setTmdbLoading(false)
        return
      }
    } catch (e) {}

      try {
      const API_KEY = 'ce1a0db13c99a45fd7effb86ab82f78f'
      const API_URL = 'https://api.themoviedb.org/3'
      // Use the movie search endpoint as a fallback so results are movie-only
      const r = await fetch(`${API_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(q)}&language=en-US&page=1`)
      const json = await r.json()
      setTmdbResults(json.results || [])
    } catch (e) {
      console.error('TMDB search failed', e)
      setTmdbResults([])
    }
    setTmdbLoading(false)
  }

  const searchTmdbSeries = async (q) => {
    if (!q || q.trim().length < 2) {
      setTmdbSeriesResults([])
      return
    }
    setTmdbSeriesLoading(true)
    try {
      const proxyResp = await fetch(`/api/tmdb/search?query=${encodeURIComponent(q)}&type=tv`)
      if (proxyResp.ok) {
        const json = await proxyResp.json()
        // Ensure we only surface TV results. TMDB tv search may return objects without media_type.
        const tvOnly = (json.results || []).filter(r => r.media_type === 'tv' || (!r.media_type && (r.name || r.first_air_date)))
        setTmdbSeriesResults(tvOnly)
        setTmdbSeriesLoading(false)
        return
      }
    } catch (e) {}
    try {
      const API_KEY = 'ce1a0db13c99a45fd7effb86ab82f78f'
      const r = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(q)}&language=en-US&page=1`)
      const json = await r.json()
      setTmdbSeriesResults(json.results || [])
    } catch (e) {
      console.error('TMDB search failed', e)
      setTmdbSeriesResults([])
    }
    setTmdbSeriesLoading(false)
  }

  const onTmdbChange = (val) => {
    setTmdbQuery(val)
    if (tmdbTimer.current) clearTimeout(tmdbTimer.current)
    tmdbTimer.current = setTimeout(() => searchTmdb(val), 380)
  }

  const onTmdbSeriesChange = (val) => {
    setTmdbSeriesQuery(val)
    if (tmdbSeriesTimer.current) clearTimeout(tmdbSeriesTimer.current)
    tmdbSeriesTimer.current = setTimeout(() => searchTmdbSeries(val), 380)
  }

  const toggleRole = async (id, newRole) => {
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', id)
    if (error) {
      console.error(error)
      showMsg('Failed to update role', 'error')
      return
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
          <button onClick={() => navigate(-1)} className="back">← Back</button>
          <button onClick={handleSignOut} className="back">Sign out</button>
        </div>
      </div>

      {message && (
        <div style={{ padding: 10, marginBottom: 12, borderRadius: 6, background: message.type === 'success' ? '#2d6a4f' : message.type === 'info' ? '#0369a1' : '#7f1d1d', color: '#fff' }}>
          {message.text}
        </div>
      )}

      <div className="admin-grid" style={{ maxWidth: 1200, width: '100%', margin: '0 auto' }}>
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
        </div>

        <div>
          <section style={cardStyle}>
            <h2 style={h2Style}>Movie Download Links</h2>
            <div style={{ display: 'grid', gap: 8 }}>
              <input placeholder="Search movies (TMDB)" value={tmdbQuery} onChange={(e) => onTmdbChange(e.target.value)} style={inputStyle} />
              {tmdbLoading && <div style={{ color: '#9fb0c8' }}>Searching...</div>}
              {!tmdbLoading && tmdbResults.length > 0 && (
                <div style={{ maxHeight: 280, overflow: 'auto', display: 'grid', gap: 8 }}>
                  {tmdbResults.filter(r => (r.media_type === 'movie' || (!r.media_type && r.title))).map(r => (
                    (r.media_type === 'movie' || (!r.media_type && r.title)) && (
                    <div key={`${r.media_type || 'movie'}-${r.id}`} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 8, background: selectedTmdb?.id === r.id ? '#1e4620' : '#071121', borderRadius: 6, border: selectedTmdb?.id === r.id ? '1px solid #4ade80' : 'none' }}>
                      <img src={r.poster_path ? `https://image.tmdb.org/t/p/w92${r.poster_path}` : ''} alt="" style={{ width: 48, height: 72, objectFit: 'cover', borderRadius: 4 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{r.title}</div>
                        <div style={{ fontSize: 12, color: '#9fb0c8' }}>Movie • {r.release_date || ''}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {selectedTmdb?.id === r.id && <span style={{ color: '#4ade80', fontWeight: 600 }}>✓ Selected</span>}
                        <button onClick={() => { setSelectedTmdb({ id: r.id, type: 'movie', title: r.title }); showMsg('Selected: ' + r.title) }}>Select</button>
                      </div>
                    </div>
                    )
                  ))}
                </div>
              )}
              {(!tmdbLoading && tmdbResults.length === 0 && tmdbQuery.trim().length >= 2) && <div style={{ color: '#9fb0c8' }}>No results</div>}
            </div>

            <h2 style={{ ...h2Style, marginTop: 12 }}>Add Movie Link</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button onClick={() => setShowBulkMovieForm(true)} style={{ ...primaryButtonStyle, background: '#7c3aed' }}>+ Bulk Add</button>
              <button onClick={() => {
                if (!selectedTmdb) return showMsg('Please select a movie first', 'error')
                setShowMovieScraperModal(true)
              }} style={{ ...primaryButtonStyle, background: '#f59e0b' }}>🎬 Scrape Movie</button>
            </div>
            <NewLinkForm onAdded={() => fetchLinks()} showMsg={showMsg} selectedTmdb={selectedTmdb} />

            {loadingLinks ? <p>Loading links...</p> : (
              <div style={{ marginTop: 12 }}>
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ display: 'flex', gap: 12, paddingBottom: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginRight: 8 }}>
                        <input type="checkbox" checked={groups.length > 0 && selectedMovieGroupIds.size === groups.filter(g => g.movie_id).length} onChange={(e) => {
                          const next = new Set(selectedMovieGroupIds)
                          if (e.target.checked) {
                            groups.forEach((g, i) => { if (g.movie_id) next.add(String(g.movie_id)) })
                          } else {
                            next.clear()
                          }
                          setSelectedMovieGroupIds(next)
                        }} />
                        <button onClick={async () => {
                          if (selectedMovieGroupIds.size === 0) return showMsg('No movies selected', 'error')
                          if (!confirm(`Scrape ${selectedMovieGroupIds.size} movie(s)?`)) return
                          const { data: session } = await supabase.auth.getSession()
                          const token = session?.session?.access_token
                          if (!token) return showMsg('Authentication required', 'error')
                          let total = 0
                          for (const idKey of Array.from(selectedMovieGroupIds)) {
                            if (String(idKey).startsWith('nomovie')) continue
                            const movieId = Number(idKey)
                            const grp = groups.find(x => String(x.movie_id) === String(movieId))
                            const movieTitle = grp?.title || (grp?.links && grp.links[0]?.title) || 'Unknown'
                            try {
                              const resp = await fetch(`/api/scraper/movie`, {
                                method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ movieId, movieTitle })
                              })
                              const text = await resp.text()
                              let data
                              try { data = text ? JSON.parse(text) : {} } catch (e) { data = { _raw: text } }
                              if (resp.ok && data && data.success) total += (data.count || 0)
                            } catch (e) { console.error('bulk scrape movie error', e) }
                          }
                          showMsg(`Finished scraping. Found ${total} links (attempted ${selectedMovieGroupIds.size})`)
                          fetchLinks()
                        }} style={{ padding: '6px 10px' }}>Bulk Scrape</button>
                        <button onClick={async () => {
                          if (selectedMovieGroupIds.size === 0) return showMsg('No movies selected', 'error')
                          if (!confirm(`Delete ${selectedMovieGroupIds.size} movie group(s) and all their links?`)) return
                          let deletedCount = 0
                          let failedCount = 0
                          for (const idKey of Array.from(selectedMovieGroupIds)) {
                            if (String(idKey).startsWith('nomovie')) continue
                            const grp = groups.find(x => String(x.movie_id) === String(idKey))
                            if (grp?.links) {
                              for (const link of grp.links) {
                                const { error } = await supabase.from('download_links').delete().eq('id', link.id)
                                if (error) failedCount++
                                else deletedCount++
                              }
                            }
                          }
                          if (failedCount > 0) showMsg(`Deleted ${deletedCount}, but ${failedCount} failed`, 'error')
                          else showMsg(`Deleted ${deletedCount} movie group(s)`)
                          setSelectedMovieGroupIds(new Set())
                          await fetchLinks()
                        }} style={{ padding: '6px 10px', background: '#dc2626', color: '#fff' }}>Delete Selected</button>
                        <button onClick={() => setSelectedMovieGroupIds(new Set())} style={{ padding: '6px 10px' }}>Clear</button>
                      </div>
                      {groups.length === 0 && <div style={{ color: '#9fb0c8' }}>No movie links yet.</div>}
                      {groups.map((g, idx) => {
                      const idKey = g.movie_id || `nomovie_${idx}`
                        const isSelected = selectedMovieGroupIds.has(String(idKey))
                      return (
                        <div key={`${idKey}-${idx}`} style={{ flex: '0 1 180px', background: isSelected ? '#102318' : '#0b1420', borderRadius: 8, padding: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input type="checkbox" checked={isSelected} onChange={(e) => {
                              const next = new Set(selectedMovieGroupIds)
                              if (e.target.checked) next.add(String(idKey))
                              else next.delete(String(idKey))
                              setSelectedMovieGroupIds(next)
                            }} style={{ marginRight: 8 }} />
                          <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }} onClick={() => setSelectedGroup(g)}>
                            <img src={g.poster || 'https://via.placeholder.com/64x92?text=No'} alt="poster" style={{ width: 64, height: 92, objectFit: 'cover', borderRadius: 6 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, color: '#f9d3b4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.title}</div>
                              <div style={{ fontSize: 12, color: '#9fb0c8', marginTop: 6 }}>{g.links.length} link{g.links.length > 1 ? 's' : ''}</div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Movie Modal */}
      {selectedGroup && (
        <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setSelectedGroup(null)}>
          <div style={{ background: '#071021', color: '#e6eef8', borderRadius: 10, maxWidth: 760, width: '96%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 18, borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
                    <input type="checkbox" checked={selectedGroup.links.length > 0 && selectedGroup.links.every(l => selectedMovieLinkIds.has(l.id))} onChange={(e) => {
                      if (e.target.checked) {
                        const all = new Set(selectedMovieLinkIds)
                        selectedGroup.links.forEach(l => all.add(l.id))
                        setSelectedMovieLinkIds(all)
                      } else {
                        const next = new Set(selectedMovieLinkIds)
                        selectedGroup.links.forEach(l => next.delete(l.id))
                        setSelectedMovieLinkIds(next)
                      }
                    }} style={{ width: 18, height: 18 }} />
                    <img src={selectedGroup.poster || 'https://via.placeholder.com/80x120?text=No'} alt="poster" style={{ width: 80, height: 120, objectFit: 'cover', borderRadius: 6 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{selectedGroup.title}</div>
                      <div style={{ color: '#9fb0c8', marginTop: 6 }}>{selectedGroup.links.length} link{selectedGroup.links.length > 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  {selectedMovieLinkIds.size > 0 && (
                    <button onClick={async () => {
                      if (!confirm(`Delete ${selectedMovieLinkIds.size} link(s)?`)) return
                      const ids = Array.from(selectedMovieLinkIds)
                      let deletedCount = 0
                      let failedCount = 0
                      for (const id of ids) {
                        const { error } = await supabase.from('download_links').delete().eq('id', id)
                        if (error) failedCount++
                        else deletedCount++
                      }
                      if (failedCount > 0) showMsg(`Deleted ${deletedCount}, but ${failedCount} failed`, 'error')
                      else showMsg(`Deleted ${ids.length} link(s)`)
                      setSelectedMovieLinkIds(new Set())
                      await fetchLinks()
                    }} style={{ background: '#dc2626', padding: '8px 12px', borderRadius: 6, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Delete {selectedMovieLinkIds.size}
                    </button>
                  )}
                </div>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                {selectedGroup.links.map(l => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', background: selectedMovieLinkIds.has(l.id) ? '#1e3a1f' : '#0b1420', padding: 10, borderRadius: 6, border: selectedMovieLinkIds.has(l.id) ? '1px solid #4ade80' : 'none' }}>
                    <input type="checkbox" checked={selectedMovieLinkIds.has(l.id)} onChange={(e) => {
                      const newSet = new Set(selectedMovieLinkIds)
                      if (e.target.checked) newSet.add(l.id)
                      else newSet.delete(l.id)
                      setSelectedMovieLinkIds(newSet)
                    }} style={{ marginRight: 12, cursor: 'pointer' }} />
                    <a href={l.url} target="_blank" rel="noreferrer" style={{ color: '#f9d3b4', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</a>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button onClick={() => { window.open(l.url, '_blank') }}>Open</button>
                      <button onClick={async () => { if (!confirm('Delete this link?')) return; const { error } = await supabase.from('download_links').delete().eq('id', l.id); if (error) showMsg('Failed to delete', 'error'); else { showMsg('Deleted'); await fetchLinks(); } }} style={{ background: 'transparent' }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div style={{ padding: 18, borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, textAlign: 'right' }}>
              <button onClick={() => setSelectedGroup(null)} style={{ padding: '8px 12px', borderRadius: 8 }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Series Management Section */}
      <div style={{ marginTop: 30, paddingBottom: 20 }}>
        <section style={cardStyle}>
          <h2 style={h2Style}>TV Series Links</h2>
          <div style={{ display: 'grid', gap: 8 }}>
            <input placeholder="Search series (TMDB)" value={tmdbSeriesQuery} onChange={(e) => onTmdbSeriesChange(e.target.value)} style={inputStyle} />
            {tmdbSeriesLoading && <div style={{ color: '#9fb0c8' }}>Searching...</div>}
            {!tmdbSeriesLoading && tmdbSeriesResults.length > 0 && (
              <div style={{ maxHeight: 280, overflow: 'auto', display: 'grid', gap: 8 }}>
                {tmdbSeriesResults.map(r => (
                  <div key={`${r.media_type || 'tv'}-${r.id}`} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 8, background: '#071121', borderRadius: 6 }}>
                    <img src={r.poster_path ? `https://image.tmdb.org/t/p/w92${r.poster_path}` : ''} alt="" style={{ width: 48, height: 72, objectFit: 'cover', borderRadius: 4 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      <div style={{ fontSize: 12, color: '#9fb0c8' }}>TV • {r.first_air_date || ''}</div>
                    </div>
                    <div>
                      <button onClick={() => { setSelectedTmdbSeries({ id: r.id, name: r.name }); showMsg('Selected: ' + r.name) }}>Select</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(!tmdbSeriesLoading && tmdbSeriesResults.length === 0 && tmdbSeriesQuery.trim().length >= 2) && <div style={{ color: '#9fb0c8' }}>No results</div>}
          </div>

          <h2 style={{ ...h2Style, marginTop: 12 }}>Add Series Links</h2>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button onClick={() => setShowBulkSeriesForm(true)} style={{ ...primaryButtonStyle, background: '#7c3aed' }}>+ Bulk Add</button>
            <button onClick={() => {
              if (seriesGroups.length === 0) return showMsg('No series added yet', 'error')
              showMsg('Select a series below to scrape episodes', 'info')
            }} style={{ ...primaryButtonStyle, background: '#0891b2' }}>🎬 Scrape Episodes</button>
          </div>
          <NewSeriesLinkForm onAdded={() => fetchSeriesLinks()} showMsg={showMsg} selectedTmdbSeries={selectedTmdbSeries} />

          {loadingSeriesLinks ? <p>Loading series links...</p> : (
            <div style={{ marginTop: 12 }}>
              <div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'flex', gap: 12, paddingBottom: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginRight: 8 }}>
                    <input type="checkbox" checked={seriesGroups.length > 0 && selectedSeriesGroupIds.size === seriesGroups.filter(g => g.tv_id).length} onChange={(e) => {
                      const next = new Set(selectedSeriesGroupIds)
                      if (e.target.checked) seriesGroups.forEach(g => { if (g.tv_id) next.add(String(g.tv_id)) })
                      else next.clear()
                      setSelectedSeriesGroupIds(next)
                    }} />
                    <button onClick={async () => {
                      if (selectedSeriesGroupIds.size === 0) return showMsg('No series selected', 'error')
                      const seasonStr = prompt('Season number to scrape for all selected:')
                      if (!seasonStr) return
                      const episodeStr = prompt('Episode number to scrape for all selected:')
                      if (!episodeStr) return
                      if (!confirm(`Scrape ${selectedSeriesGroupIds.size} series entries for S${seasonStr}E${episodeStr}?`)) return
                      const { data: session } = await supabase.auth.getSession()
                      const token = session?.session?.access_token
                      if (!token) return showMsg('Authentication required', 'error')
                      let total = 0
                      for (const idKey of Array.from(selectedSeriesGroupIds)) {
                        if (String(idKey).startsWith('noseries')) continue
                        const tvId = Number(idKey)
                        const grp = seriesGroups.find(x => String(x.tv_id) === String(tvId))
                        const seriesTitle = grp?.title || (grp?.links && (grp.links[0]?.series_title || grp.links[0]?.title)) || 'Unknown'
                        try {
                          const resp = await fetch(`/api/scraper/episode`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ tvId, seriesTitle, season: Number(seasonStr), episode: Number(episodeStr) })
                          })
                          const text = await resp.text()
                          let data
                          try { data = text ? JSON.parse(text) : {} } catch (e) { data = { _raw: text } }
                          if (resp.ok && data && data.success) total += (data.count || 0)
                        } catch (e) { console.error('bulk scrape series error', e) }
                      }
                      showMsg(`Finished scraping series. Found ${total} links (attempted ${selectedSeriesGroupIds.size})`)
                      fetchSeriesLinks()
                    }} style={{ padding: '6px 10px' }}>Bulk Scrape</button>
                    <button onClick={async () => {
                      if (selectedSeriesGroupIds.size === 0) return showMsg('No series selected', 'error')
                      if (!confirm(`Delete ${selectedSeriesGroupIds.size} series group(s) and all their links?`)) return
                      let deletedCount = 0
                      let failedCount = 0
                      for (const idKey of Array.from(selectedSeriesGroupIds)) {
                        if (String(idKey).startsWith('noseries')) continue
                        const grp = seriesGroups.find(x => String(x.tv_id) === String(idKey))
                        if (grp?.links) {
                          for (const link of grp.links) {
                            const { error } = await supabase.from('series_links').delete().eq('id', link.id)
                            if (error) failedCount++
                            else deletedCount++
                          }
                        }
                      }
                      if (failedCount > 0) showMsg(`Deleted ${deletedCount}, but ${failedCount} failed`, 'error')
                      else showMsg(`Deleted ${deletedCount} series group(s)`)
                      setSelectedSeriesGroupIds(new Set())
                      await fetchSeriesLinks()
                    }} style={{ padding: '6px 10px', background: '#dc2626', color: '#fff' }}>Delete Selected</button>
                    <button onClick={() => setSelectedSeriesGroupIds(new Set())} style={{ padding: '6px 10px' }}>Clear</button>
                  </div>
                  {seriesGroups.length === 0 && <div style={{ color: '#9fb0c8' }}>No series links yet.</div>}
                  {seriesGroups.map((g, idx) => {
                    const idKey = g.tv_id || `noseries_${idx}`
                    const isSelected = selectedSeriesGroupIds.has(String(idKey))
                    return (
                      <div key={`${idKey}-${idx}`} style={{ flex: '0 1 180px', background: isSelected ? '#102318' : '#0b1420', borderRadius: 8, padding: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="checkbox" checked={isSelected} onChange={(e) => {
                          const next = new Set(selectedSeriesGroupIds)
                          if (e.target.checked) next.add(String(idKey))
                          else next.delete(String(idKey))
                          setSelectedSeriesGroupIds(next)
                        }} style={{ marginRight: 8 }} />
                        <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }} onClick={() => setSelectedSeriesGroup(g)}>
                          <img src={g.poster || 'https://via.placeholder.com/64x92?text=No'} alt="poster" style={{ width: 64, height: 92, objectFit: 'cover', borderRadius: 6 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: '#f9d3b4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.title}</div>
                            <div style={{ fontSize: 12, color: '#9fb0c8', marginTop: 6 }}>{g.links.length} link{g.links.length > 1 ? 's' : ''}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Modal for series group details */}
          {selectedSeriesGroup && (
            <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => { setSelectedSeriesGroup(null); setSelectedSeriesLinkIds(new Set()) }}>
              <div style={{ background: '#071021', color: '#e6eef8', borderRadius: 10, maxWidth: 760, width: '96%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ padding: 18, borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
                      <input type="checkbox" checked={selectedSeriesGroup.links.length > 0 && selectedSeriesGroup.links.every(l => selectedSeriesLinkIds.has(l.id))} onChange={(e) => {
                        if (e.target.checked) {
                          const all = new Set(selectedSeriesLinkIds)
                          selectedSeriesGroup.links.forEach(l => all.add(l.id))
                          setSelectedSeriesLinkIds(all)
                        } else {
                          const next = new Set(selectedSeriesLinkIds)
                          selectedSeriesGroup.links.forEach(l => next.delete(l.id))
                          setSelectedSeriesLinkIds(next)
                        }
                      }} style={{ width: 18, height: 18 }} />
                      <img src={selectedSeriesGroup.poster || 'https://via.placeholder.com/80x120?text=No'} alt="poster" style={{ width: 80, height: 120, objectFit: 'cover', borderRadius: 6 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>{selectedSeriesGroup.title}</div>
                        <div style={{ color: '#9fb0c8', marginTop: 6 }}>{selectedSeriesGroup.links.length} link{selectedSeriesGroup.links.length > 1 ? 's' : ''}</div>
                      </div>
                    </div>
                    {selectedSeriesLinkIds.size > 0 && (
                      <button onClick={async () => {
                        if (!confirm(`Delete ${selectedSeriesLinkIds.size} link(s)?`)) return
                        const ids = Array.from(selectedSeriesLinkIds)
                        let deletedCount = 0
                        let failedCount = 0
                        for (const id of ids) {
                          const { error } = await supabase.from('series_links').delete().eq('id', id)
                          if (error) failedCount++
                          else deletedCount++
                        }
                        if (failedCount > 0) showMsg(`Deleted ${deletedCount}, but ${failedCount} failed`, 'error')
                        else showMsg(`Deleted ${ids.length} link(s)`)
                        setSelectedSeriesLinkIds(new Set())
                        await fetchSeriesLinks()
                      }} style={{ background: '#dc2626', padding: '8px 12px', borderRadius: 6, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                        Delete {selectedSeriesLinkIds.size}
                      </button>
                    )}
                    <button onClick={() => setShowSeriesScraperModal(true)} style={{ background: '#0891b2', padding: '8px 12px', borderRadius: 6, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      🎬 Scrape Episodes
                    </button>
                  </div>
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {selectedSeriesGroup.links.map(l => (
                      <div key={l.id} style={{ display: 'flex', alignItems: 'center', background: selectedSeriesLinkIds.has(l.id) ? '#1e3a1f' : '#0b1420', padding: 10, borderRadius: 6, border: selectedSeriesLinkIds.has(l.id) ? '1px solid #4ade80' : 'none' }}>
                        <input type="checkbox" checked={selectedSeriesLinkIds.has(l.id)} onChange={(e) => {
                          const newSet = new Set(selectedSeriesLinkIds)
                          if (e.target.checked) newSet.add(l.id)
                          else newSet.delete(l.id)
                          setSelectedSeriesLinkIds(newSet)
                        }} style={{ marginRight: 12, cursor: 'pointer' }} />
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, minWidth: '140px', fontSize: 12, color: '#9fb0c8' }}>S{l.season_number}E{l.episode_number}</div>
                          <div style={{ fontWeight: 600, color: '#f9d3b4', minWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</div>
                          <a href={l.url} target="_blank" rel="noreferrer" style={{ color: '#9fb0c8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>{l.url}</a>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <button onClick={() => { window.open(l.url, '_blank') }} style={{ padding: '6px 10px', borderRadius: 6, fontSize: 12 }}>Open</button>
                          <button onClick={async () => { if (!confirm('Delete this link?')) return; const { error } = await supabase.from('series_links').delete().eq('id', l.id); if (error) showMsg('Failed to delete', 'error'); else { showMsg('Deleted'); await fetchSeriesLinks(); } }} style={{ background: 'transparent', fontSize: 12 }}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div style={{ padding: 18, borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, textAlign: 'right' }}>
                  <button onClick={() => { setSelectedSeriesGroup(null); setSelectedSeriesLinkIds(new Set()) }} style={{ padding: '8px 12px', borderRadius: 8 }}>Close</button>
                </div>
              </div>
            </div>
          )}

          {/* Series Episode Scraper Modal */}
          {showSeriesScraperModal && selectedSeriesGroup && (
            <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }} onClick={() => setShowSeriesScraperModal(false)}>
              <div style={{ background: '#071021', color: '#e6eef8', borderRadius: 10, maxWidth: 500, width: '96%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ padding: 18, borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>Scrape Episodes - {selectedSeriesGroup.title}</div>
                  <div style={{ fontSize: 12, color: '#9fb0c8', marginTop: 6 }}>Choose scraping mode and episodes</div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'grid', gap: 16 }}>
                  {/* Mode Selection */}
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>Scraping Mode</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <button
                        onClick={() => { setSeriesScraperMode('season'); setSeriesEpisodes('') }}
                        style={{
                          padding: '12px',
                          borderRadius: 6,
                          border: seriesScraperMode === 'season' ? '2px solid #4ade80' : '1px solid rgba(255,255,255,0.1)',
                          background: seriesScraperMode === 'season' ? 'rgba(74,222,128,0.1)' : '#0b1420',
                          color: '#e6eef8',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        🎬 Full Season
                      </button>
                      <button
                        onClick={() => { setSeriesScraperMode('manual'); setSeriesEpisodes('') }}
                        style={{
                          padding: '12px',
                          borderRadius: 6,
                          border: seriesScraperMode === 'manual' ? '2px solid #4ade80' : '1px solid rgba(255,255,255,0.1)',
                          background: seriesScraperMode === 'manual' ? 'rgba(74,222,128,0.1)' : '#0b1420',
                          color: '#e6eef8',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        ✋ Manual Select
                      </button>
                    </div>
                  </div>

                  {/* Season Input (always visible) */}
                  <div>
                    <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Season Number</label>
                    <input
                      type="number"
                      min="1"
                      value={seriesSeason}
                      onChange={(e) => setSeriesSeason(e.target.value)}
                      placeholder="e.g., 1"
                      style={{ ...inputStyle, width: '100%' }}
                    />
                  </div>

                  {/* Full Season Mode */}
                  {seriesScraperMode === 'season' && (
                    <div style={{ background: 'rgba(74,222,128,0.05)', padding: 12, borderRadius: 6, borderLeft: '3px solid #4ade80' }}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Full Season Mode</div>
                      <div style={{ fontSize: 12, color: '#9fb0c8' }}>
                        Will scrape all episodes of season {seriesSeason || '?'} from Nkiri
                      </div>
                    </div>
                  )}

                  {/* Manual Episode Mode */}
                  {seriesScraperMode === 'manual' && (
                    <div>
                      <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Episodes to Scrape</label>
                      <input
                        type="text"
                        value={seriesEpisodes}
                        onChange={(e) => setSeriesEpisodes(e.target.value)}
                        placeholder="e.g., 1,2,3 or 1-5"
                        style={{ ...inputStyle, width: '100%' }}
                      />
                      <div style={{ fontSize: 11, color: '#9fb0c8', marginTop: 6 }}>
                        Enter individual episodes (1,2,3) or ranges (1-5). Season will be {seriesSeason || '?'}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ padding: 18, borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowSeriesScraperModal(false)} style={{ padding: '8px 12px', borderRadius: 6, background: 'transparent' }}>Cancel</button>
                  <button
                    onClick={async () => {
                      if (!seriesSeason) return showMsg('Season number required', 'error')
                      if (seriesScraperMode === 'manual' && !seriesEpisodes) return showMsg('Episodes required', 'error')

                      const { data: session } = await supabase.auth.getSession()
                      const token = session?.session?.access_token
                      if (!token) return showMsg('Authentication required', 'error')

                      setSeriesScrapingLoading(true)
                      const tvId = selectedSeriesGroup.tv_id
                      const seriesTitle = selectedSeriesGroup.title
                      const season = Number(seriesSeason)
                      let totalCount = 0
                      let scrapedIds = []

                      try {
                        if (seriesScraperMode === 'season') {
                          // Scrape all episodes of the season - we'll do 1-30 to cover most seasons
                          const episodesToScrape = Array.from({ length: 30 }, (_, i) => i + 1)
                          let successCount = 0
                          let attemptedCount = 0
                          
                          for (const ep of episodesToScrape) {
                            attemptedCount++
                            try {
                              const resp = await fetch(`/api/scraper/episode`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ tvId, seriesTitle, season, episode: ep })
                              })
                              const text = await resp.text()
                              let data
                              try { data = text ? JSON.parse(text) : {} } catch (e) { data = {} }
                              if (resp.ok && data && data.success) {
                                totalCount += (data.count || 0)
                                if (data.count > 0) {
                                  successCount++
                                  if (!scrapedIds.includes(tvId)) scrapedIds.push(tvId)
                                }
                              }
                            } catch (e) {
                              console.warn(`Episode ${ep} failed:`, e)
                            }
                          }
                          showMsg(`✓ Season ${season}: ${totalCount} link(s) found across ${successCount}/${attemptedCount} episodes checked`)
                        } else {
                          // Manual episode selection - parse episodes
                          const episodeSet = new Set()
                          const parts = seriesEpisodes.split(',').map(p => p.trim())
                          for (const part of parts) {
                            if (part.includes('-')) {
                              const [start, end] = part.split('-').map(Number)
                              for (let i = start; i <= end; i++) episodeSet.add(i)
                            } else {
                              episodeSet.add(Number(part))
                            }
                          }
                          const episodesToScrape = Array.from(episodeSet).filter(e => !isNaN(e) && e > 0).sort((a, b) => a - b)
                          let successCount = 0
                          
                          for (const ep of episodesToScrape) {
                            try {
                              const resp = await fetch(`/api/scraper/episode`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ tvId, seriesTitle, season, episode: ep })
                              })
                              const text = await resp.text()
                              let data
                              try { data = text ? JSON.parse(text) : {} } catch (e) { data = {} }
                              if (resp.ok && data && data.success) {
                                totalCount += (data.count || 0)
                                if (data.count > 0) {
                                  successCount++
                                  if (!scrapedIds.includes(tvId)) scrapedIds.push(tvId)
                                }
                              }
                            } catch (e) {
                              console.warn(`Episode ${ep} failed:`, e)
                            }
                          }
                          showMsg(`✓ ${successCount}/${episodesToScrape.length} episodes had links. Total: ${totalCount} link(s)`)
                        }
                        setShowSeriesScraperModal(false)
                        setSeriesSeason('')
                        setSeriesEpisodes('')

                        // Poll for inserts and refresh
                        if (scrapedIds.length > 0) {
                          await pollForInserts(scrapedIds, 'series_links', 'tv_id')
                          fetchSeriesLinks()
                        }
                      } catch (e) {
                        console.error('Scraping error:', e)
                        showMsg('Scraping failed: ' + (e.message || e), 'error')
                      } finally {
                        setSeriesScrapingLoading(false)
                      }
                    }}
                    disabled={seriesScrapingLoading}
                    style={{ ...primaryButtonStyle }}
                  >
                    {seriesScrapingLoading ? 'Scraping...' : 'Start Scraping'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* End Series Management Section */}

      {/* Bulk Add Movies Modal */}
      {showBulkMovieForm && (
        <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={() => setShowBulkMovieForm(false)}>
          <div style={{ background: '#071021', color: '#e6eef8', borderRadius: 10, maxWidth: 600, width: '96%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 18, borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Bulk Add Movie Links</div>
              <div style={{ fontSize: 12, color: '#9fb0c8', marginTop: 6 }}>Paste movie data in CSV format: movie_id,title,url</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
              <BulkMovieForm onAdded={() => { fetchLinks(); setShowBulkMovieForm(false) }} showMsg={showMsg} />
            </div>
            <div style={{ padding: 18, borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, textAlign: 'right' }}>
              <button onClick={() => setShowBulkMovieForm(false)} style={{ padding: '8px 12px', borderRadius: 8 }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Movie Scraper Modal */}
      {showMovieScraperModal && selectedTmdb && (
        <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }} onClick={() => setShowMovieScraperModal(false)}>
          <div style={{ background: '#071021', color: '#e6eef8', borderRadius: 10, maxWidth: 500, width: '96%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 18, borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Scrape Movie - {selectedTmdb.title}</div>
              <div style={{ fontSize: 12, color: '#9fb0c8', marginTop: 6 }}>Find download links from Nkiri</div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'grid', gap: 16 }}>
              <div style={{ background: 'rgba(74,222,128,0.1)', padding: 12, borderRadius: 6, borderLeft: '3px solid #4ade80' }}>
                <div style={{ fontWeight: 600, color: '#4ade80', marginBottom: 6 }}>🎬 {selectedTmdb.title}</div>
                <div style={{ fontSize: 12, color: '#9fb0c8' }}>
                  Movie ID: {selectedTmdb.id}
                  <br />
                  This will search Nkiri for available download links for this movie and add them automatically.
                </div>
              </div>
            </div>

            <div style={{ padding: 18, borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowMovieScraperModal(false)} style={{ padding: '8px 12px', borderRadius: 6, background: 'transparent' }}>Cancel</button>
              <button
                onClick={async () => {
                  const { data: session } = await supabase.auth.getSession()
                  const token = session?.session?.access_token
                  if (!token) return showMsg('Authentication required', 'error')

                  setMovieScrapingLoading(true)
                  try {
                    const resp = await fetch(`/api/scraper/movie`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ movieId: Number(selectedTmdb.id), movieTitle: selectedTmdb.title })
                    })
                    const text = await resp.text()
                    let data
                    try { data = text ? JSON.parse(text) : {} } catch (e) { data = {} }
                    if (resp.ok && data && data.success) {
                      showMsg(`✓ Found ${data.count || 0} link(s) for ${selectedTmdb.title}`)
                      setShowMovieScraperModal(false)
                      await pollForInserts([Number(selectedTmdb.id)], 'download_links', 'movie_id')
                      fetchLinks()
                    } else {
                      showMsg(`No links found for ${selectedTmdb.title}`, 'error')
                    }
                  } catch (e) {
                    console.error('Movie scraping error:', e)
                    showMsg('Scraping failed: ' + (e.message || e), 'error')
                  } finally {
                    setMovieScrapingLoading(false)
                  }
                }}
                disabled={movieScrapingLoading}
                style={{ ...primaryButtonStyle }}
              >
                {movieScrapingLoading ? 'Scraping...' : 'Start Scraping'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Series Modal */}
      {showBulkSeriesForm && (
        <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={() => setShowBulkSeriesForm(false)}>
          <div style={{ background: '#071021', color: '#e6eef8', borderRadius: 10, maxWidth: 600, width: '96%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 18, borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Bulk Add Series Links</div>
              <div style={{ fontSize: 12, color: '#9fb0c8', marginTop: 6 }}>Paste series data in CSV format: tv_id,series_title,season,episode,url</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
              <BulkSeriesForm onAdded={() => { fetchSeriesLinks(); setShowBulkSeriesForm(false) }} showMsg={showMsg} />
            </div>
            <div style={{ padding: 18, borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, textAlign: 'right' }}>
              <button onClick={() => setShowBulkSeriesForm(false)} style={{ padding: '8px 12px', borderRadius: 8 }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Scraper Section */}
      <div style={{ marginTop: 30, paddingBottom: 20 }}>
        <section style={cardStyle}>
          <h2 style={h2Style}>Single Movie/Series Scraper</h2>
          <div style={{ display: 'grid', gap: 8 }}>
            <p style={{ color: '#9fb0c8', fontSize: 14 }}>Use the options above to scrape movies or TV episodes. For movies, use the Movie section. For TV series, use the TV Series section with the new episode scraper.</p>
            <div style={{ background: 'rgba(74,222,128,0.1)', padding: 12, borderRadius: 6, borderLeft: '3px solid #4ade80' }}>
              <div style={{ fontWeight: 600, color: '#4ade80', marginBottom: 6 }}>💡 New Feature Available</div>
              <div style={{ fontSize: 12, color: '#9fb0c8' }}>
                The TV Series section now includes a powerful episode scraper with Full Season and Manual Selection modes. 
                <br /><br />
                <strong>Full Season Mode:</strong> Scrape all episodes 1-20 of a season automatically
                <br />
                <strong>Manual Mode:</strong> Scrape specific episodes (e.g., 1,2,3 or 1-5 or 1-3,5,7-9)
                <br /><br />
                To use: Select a series → Click its card → Click "🎬 Scrape Episodes"
              </div>
            </div>
          </div>
        </section>
      </div>
      {/* End Scraper Section */}
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
  const [res360, setRes360] = useState('')
  const [res460, setRes460] = useState('')
  const [res720, setRes720] = useState('')
  const [res1080, setRes1080] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedTmdb) {
      if (selectedTmdb.title) setTitle(selectedTmdb.title)
      if (selectedTmdb.id) setMovieId(String(selectedTmdb.id))
    }
  }, [selectedTmdb])

  const add = async () => {
    if (!title.trim()) return
    const inserts = []
    if (url.trim()) inserts.push({ title: title.trim(), url: url.trim() })
    if (res360.trim()) inserts.push({ title: `${title.trim()} (360p)`, url: res360.trim() })
    if (res460.trim()) inserts.push({ title: `${title.trim()} (460p)`, url: res460.trim() })
    if (res720.trim()) inserts.push({ title: `${title.trim()} (720p)`, url: res720.trim() })
    if (res1080.trim()) inserts.push({ title: `${title.trim()} (1080p)`, url: res1080.trim() })
    if (inserts.length === 0) return
    setLoading(true)
    const payloads = inserts.map(p => ({ ...p, movie_id: movieId.trim() ? Number(movieId) : null }))
    const { data, error } = await supabase.from('download_links').insert(payloads).select()
    setLoading(false)
    if (error) {
      console.error(error)
      showMsg?.('Failed to add link(s): ' + (error.message || error), 'error')
    } else {
      setTitle(''); setUrl(''); setMovieId(''); setRes360(''); setRes460(''); setRes720(''); setRes1080('')
      showMsg?.('Link(s) added')
      onAdded()
    }
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <input className="admin-input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
      <input className="admin-input" placeholder="Default URL (optional)" value={url} onChange={(e) => setUrl(e.target.value)} style={inputStyle} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input className="admin-input" placeholder="360p URL" value={res360} onChange={(e) => setRes360(e.target.value)} style={inputStyle} />
        <input className="admin-input" placeholder="460p URL" value={res460} onChange={(e) => setRes460(e.target.value)} style={inputStyle} />
        <input className="admin-input" placeholder="720p URL" value={res720} onChange={(e) => setRes720(e.target.value)} style={inputStyle} />
        <input className="admin-input" placeholder="1080p URL" value={res1080} onChange={(e) => setRes1080(e.target.value)} style={inputStyle} />
      </div>
      <input className="admin-input" placeholder="movie_id (optional)" value={movieId} onChange={(e) => setMovieId(e.target.value)} style={inputStyle} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={add} disabled={loading} style={primaryButtonStyle}>{loading ? 'Adding...' : 'Add link(s)'}</button>
      </div>
    </div>
  )
}

const NewSeriesLinkForm = ({ onAdded, showMsg, selectedTmdbSeries }) => {
  const [season, setSeason] = useState('')
  const [episode, setEpisode] = useState('')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [res360, setRes360] = useState('')
  const [res460, setRes460] = useState('')
  const [res720, setRes720] = useState('')
  const [res1080, setRes1080] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedTmdbSeries?.name) {
      setTitle(selectedTmdbSeries.name)
    }
  }, [selectedTmdbSeries])

  const add = async () => {
    if (!season.trim() || !episode.trim()) {
      showMsg?.('Season and episode are required', 'error')
      return
    }
    if (!selectedTmdbSeries?.id) {
      showMsg?.('Select a series first', 'error')
      return
    }

    const inserts = []
    if (url.trim()) inserts.push({ title: title.trim() || 'Download', url: url.trim() })
    if (res360.trim()) inserts.push({ title: `${title.trim() || 'Download'} (360p)`, url: res360.trim() })
    if (res460.trim()) inserts.push({ title: `${title.trim() || 'Download'} (460p)`, url: res460.trim() })
    if (res720.trim()) inserts.push({ title: `${title.trim() || 'Download'} (720p)`, url: res720.trim() })
    if (res1080.trim()) inserts.push({ title: `${title.trim() || 'Download'} (1080p)`, url: res1080.trim() })
    
    if (inserts.length === 0) {
      showMsg?.('Add at least one URL', 'error')
      return
    }

    setLoading(true)
    const tv_id = Number(selectedTmdbSeries.id)
    const season_num = Number(season)
    const episode_num = Number(episode)
    const payloads = inserts.map(p => ({
      ...p,
      tv_id,
      season_number: season_num,
      episode_number: episode_num,
      series_title: title.trim() || 'Unknown'
    }))

    const { error } = await supabase.from('series_links').insert(payloads).select()
    setLoading(false)
    
    if (error) {
      console.error(error)
      showMsg?.('Failed to add link(s): ' + (error.message || error), 'error')
    } else {
      setSeason('')
      setEpisode('')
      setTitle('')
      setUrl('')
      setRes360('')
      setRes460('')
      setRes720('')
      setRes1080('')
      showMsg?.('Link(s) added')
      onAdded()
    }
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input className="admin-input" placeholder="Season" type="number" min="1" value={season} onChange={(e) => setSeason(e.target.value)} style={inputStyle} />
        <input className="admin-input" placeholder="Episode" type="number" min="1" value={episode} onChange={(e) => setEpisode(e.target.value)} style={inputStyle} />
      </div>
      <input className="admin-input" placeholder="Title (auto-filled)" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
      <input className="admin-input" placeholder="Default URL (optional)" value={url} onChange={(e) => setUrl(e.target.value)} style={inputStyle} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input className="admin-input" placeholder="360p URL" value={res360} onChange={(e) => setRes360(e.target.value)} style={inputStyle} />
        <input className="admin-input" placeholder="460p URL" value={res460} onChange={(e) => setRes460(e.target.value)} style={inputStyle} />
        <input className="admin-input" placeholder="720p URL" value={res720} onChange={(e) => setRes720(e.target.value)} style={inputStyle} />
        <input className="admin-input" placeholder="1080p URL" value={res1080} onChange={(e) => setRes1080(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={add} disabled={loading} style={primaryButtonStyle}>{loading ? 'Adding...' : 'Add link(s)'}</button>
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

const BulkMovieForm = ({ onAdded, showMsg }) => {
  const [csv, setCsv] = useState('')
  const [loading, setLoading] = useState(false)

  const handleBulkAdd = async () => {
    if (!csv.trim()) {
      showMsg?.('Paste CSV data first', 'error')
      return
    }
    setLoading(true)
    try {
      const lines = csv.trim().split('\n').filter(l => l.trim())
      const inserts = []
      
      for (const line of lines) {
        const [movieIdStr, title, url] = line.split(',').map(s => s.trim())
        if (title && url) {
          inserts.push({
            movie_id: movieIdStr ? Number(movieIdStr) : null,
            title,
            url
          })
        }
      }

      if (inserts.length === 0) {
        showMsg?.('No valid rows found', 'error')
        setLoading(false)
        return
      }

      const { error } = await supabase.from('download_links').insert(inserts)
      setLoading(false)
      
      if (error) {
        console.error(error)
        showMsg?.('Failed to add links: ' + (error.message || error), 'error')
      } else {
        setCsv('')
        showMsg?.(`Added ${inserts.length} link(s)`)
        onAdded()
      }
    } catch (e) {
      setLoading(false)
      showMsg?.('Error: ' + e.message, 'error')
    }
  }

  return (
    <BulkMovieFormInner csv={csv} setCsv={setCsv} loading={loading} handleBulkAdd={handleBulkAdd} showMsg={showMsg} onAdded={onAdded} />
  )
}

const BulkMovieFormInner = ({ csv, setCsv, loading, handleBulkAdd, showMsg, onAdded }) => {
  const [tmdbQuery, setTmdbQuery] = useState('')
  const [tmdbResults, setTmdbResults] = useState([])
  const [tmdbLoading, setTmdbLoading] = useState(false)
  const [selectedTmdbIds, setSelectedTmdbIds] = useState(new Set())
  const tmdbTimer = useRef(null)

  const searchTmdb = async (q) => {
    if (!q || q.trim().length < 2) {
      setTmdbResults([])
      return
    }
    setTmdbLoading(true)
    try {
      const url = `/api/tmdb/search?query=${encodeURIComponent(q)}&type=movie`
      console.log('📋 TMDB Movie search URL:', url)
      const proxyResp = await fetch(url)
      console.log('📋 TMDB Movie response status:', proxyResp.status)
      if (proxyResp.ok) {
        const json = await proxyResp.json()
        console.log('📋 TMDB Movie results:', json.results?.length || 0, 'found')
        setTmdbResults(json.results || [])
        setTmdbLoading(false)
        return
      } else {
        const errText = await proxyResp.text()
        console.error('❌ TMDB Movie search failed:', proxyResp.status, errText)
        showMsg?.('TMDB search failed: ' + proxyResp.status, 'error')
      }
    } catch (e) {
      console.error('❌ TMDB Movie search error:', e.message)
      showMsg?.('TMDB search error: ' + e.message, 'error')
    }
    setTmdbLoading(false)
  }

  const onTmdbChange = (v) => {
    setTmdbQuery(v)
    if (tmdbTimer.current) clearTimeout(tmdbTimer.current)
    tmdbTimer.current = setTimeout(() => searchTmdb(v), 300)
  }

  const addSelectedTmdb = async () => {
    if (selectedTmdbIds.size === 0) return showMsg?.('No movies selected', 'error')
    const inserts = []
    for (const id of Array.from(selectedTmdbIds)) {
      const r = tmdbResults.find(t => String(t.id) === String(id))
      if (!r) continue
      // Try to resolve a better URL via server resolver (Nkiri-only). Do not default to NewToxic.
      let resolvedUrl = null
      try {
        const ac = new AbortController()
        const timeout = setTimeout(() => ac.abort(), 20000) // 20s timeout
        const resp = await fetch('/api/scraper/resolve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: r.title || r.name }), signal: ac.signal })
        clearTimeout(timeout)
        if (resp.ok) {
          const data = await resp.json()
          if (data && data.success && Array.isArray(data.links) && data.links.length) {
            resolvedUrl = data.links[0].url
          }
        } else {
          console.warn('resolve responded with status', resp.status)
        }
      } catch (e) {
        if (e.name === 'AbortError') {
          console.warn('resolve request timed out')
        } else {
          console.warn('resolve failed', e)
        }
      }
      if (resolvedUrl) {
        const poster = r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null
        inserts.push({ movie_id: Number(r.id), title: r.title || r.name, url: resolvedUrl, poster })
      } else {
        console.warn('Skipping insert for', r.title || r.name, '- no Nkiri link found')
      }
    }
    if (inserts.length === 0) return showMsg?.('No valid TMDB rows', 'error')
    const { error } = await supabase.from('download_links').insert(inserts)
    if (error) showMsg?.('Failed to add links: ' + (error.message || error), 'error')
    else { setSelectedTmdbIds(new Set()); setTmdbResults([]); setTmdbQuery(''); showMsg?.(`Added ${inserts.length} link(s)`); onAdded() }
  }


  

  const pollForInserts = async (ids, table, idColumn, attempts = 8, delayMs = 1000) => {
    // Poll Supabase for existence of at least one row per id
    const pending = new Set(ids.map(i => Number(i)).filter(Boolean))
    for (let attempt = 0; attempt < attempts && pending.size > 0; attempt++) {
      try {
        for (const id of Array.from(pending)) {
          const { data } = await supabase.from(table).select('id').eq(idColumn, id).limit(1)
          if (Array.isArray(data) && data.length > 0) pending.delete(id)
        }
      } catch (e) {
        console.warn('pollForInserts query failed:', e && e.message)
      }
      if (pending.size > 0) await new Promise(r => setTimeout(r, delayMs))
    }
    return Array.from(pending) // remaining ids that didn't appear
  }

  const addSelectedTmdbAndScrape = async () => {
    if (selectedTmdbIds.size === 0) return showMsg?.('No movies selected', 'error')
    const { data: session } = await supabase.auth.getSession()
    const token = session?.session?.access_token
    if (!token) return showMsg('Authentication required', 'error')
    let total = 0
    const scrapedIds = []
    for (const id of Array.from(selectedTmdbIds)) {
      const r = tmdbResults.find(t => String(t.id) === String(id))
      if (!r) continue
      try {
        const resp = await fetch(`/api/scraper/movie`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ movieId: Number(r.id), movieTitle: r.title || r.name })
        })
        const text = await resp.text()
        let data
        try { data = text ? JSON.parse(text) : {} } catch (e) { data = { _raw: text } }
        if (resp.ok && data && data.success) {
          total += (data.count || 0)
          scrapedIds.push(Number(r.id))
        }
      } catch (e) { console.error('bulk scrape movie error', e) }
    }

    showMsg(`Scrape complete — found ${total} links for ${selectedTmdbIds.size} movie(s)`)
    setSelectedTmdbIds(new Set())
    setTmdbResults([])
    setTmdbQuery('')

    // Poll for inserted rows and refresh UI once present
    if (scrapedIds.length > 0) {
      await pollForInserts(scrapedIds, 'download_links', 'movie_id')
      fetchLinks()
    } else {
      fetchLinks()
    }
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <input placeholder="Search TMDB movies" value={tmdbQuery} onChange={(e) => onTmdbChange(e.target.value)} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', background: '#071021', color: '#e6eef8' }} />
      {tmdbLoading && <div style={{ color: '#9fb0c8' }}>Searching TMDB...</div>}
      {tmdbResults.length > 0 && (
        <div style={{ maxHeight: 200, overflow: 'auto', background: '#071121', padding: 8, borderRadius: 6 }}>
          {tmdbResults.map(r => (
            <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 6 }}>
              <input type="checkbox" checked={selectedTmdbIds.has(String(r.id))} onChange={(e) => { const s = new Set(selectedTmdbIds); if (e.target.checked) s.add(String(r.id)); else s.delete(String(r.id)); setSelectedTmdbIds(s) }} />
              <img src={r.poster_path ? `https://image.tmdb.org/t/p/w92${r.poster_path}` : ''} alt="" style={{ width: 36, height: 54, objectFit: 'cover', borderRadius: 3 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{r.title || r.name}</div>
                <div style={{ fontSize: 12, color: '#9fb0c8' }}>{r.release_date || ''}</div>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => { const s = new Set(tmdbResults.map(r => String(r.id))); setSelectedTmdbIds(s) }} style={{ padding: '6px 10px' }}>Select All</button>
            <button onClick={() => setSelectedTmdbIds(new Set())} style={{ padding: '6px 10px' }}>Clear</button>
            <button onClick={addSelectedTmdb} disabled={loading} style={{ padding: '6px 10px' }}>{loading ? 'Adding...' : 'Add Selected'}</button>
            <button onClick={addSelectedTmdbAndScrape} disabled={loading} style={{ ...primaryButtonStyle, marginLeft: 'auto' }}>{loading ? 'Processing...' : 'Add Selected + Scrape'}</button>
          </div>
        </div>
      )}

      <textarea 
        value={csv} 
        onChange={(e) => setCsv(e.target.value)} 
        placeholder="Paste CSV data here (movie_id,title,url)\nExample:\n123456,Movie Title,https://example.com/link"
        style={{ 
          padding: '10px', 
          borderRadius: 6, 
          border: '1px solid rgba(255,255,255,0.06)', 
          background: '#071021', 
          color: '#e6eef8',
          fontFamily: 'monospace',
          fontSize: 12,
          minHeight: 140,
          resize: 'vertical'
        }} 
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleBulkAdd} disabled={loading} style={{ ...primaryButtonStyle, background: loading ? '#4b5563' : '#2563eb' }}>{loading ? 'Adding...' : 'Add All (CSV)'}</button>
      </div>
    </div>
  )
}

const BulkSeriesForm = ({ onAdded, showMsg }) => {
  const [csv, setCsv] = useState('')
  const [loading, setLoading] = useState(false)
  const [tmdbQuery, setTmdbQuery] = useState('')
  const [tmdbResults, setTmdbResults] = useState([])
  const [tmdbLoading, setTmdbLoading] = useState(false)
  const [selectedTmdbIds, setSelectedTmdbIds] = useState(new Set())
  const [seasonForSelected, setSeasonForSelected] = useState('1')
  const [episodeForSelected, setEpisodeForSelected] = useState('1')
  const tmdbTimer = useRef(null)

  const handleBulkAdd = async () => {
    if (!csv.trim()) {
      showMsg?.('Paste CSV data first', 'error')
      return
    }
    setLoading(true)
    try {
      const lines = csv.trim().split('\n').filter(l => l.trim())
      const inserts = []
      
      for (const line of lines) {
        const [tvIdStr, seriesTitle, seasonStr, episodeStr, url] = line.split(',').map(s => s.trim())
        if (seriesTitle && seasonStr && episodeStr && url) {
          inserts.push({
            tv_id: tvIdStr ? Number(tvIdStr) : null,
            series_title: seriesTitle,
            season_number: Number(seasonStr),
            episode_number: Number(episodeStr),
            title: `${seriesTitle} S${seasonStr}E${episodeStr}`,
            url
          })
        }
      }

      if (inserts.length === 0) {
        showMsg?.('No valid rows found', 'error')
        setLoading(false)
        return
      }

      const { error } = await supabase.from('series_links').insert(inserts)
      setLoading(false)
      
      if (error) {
        console.error(error)
        showMsg?.('Failed to add links: ' + (error.message || error), 'error')
      } else {
        setCsv('')
        showMsg?.(`Added ${inserts.length} link(s)`)
        onAdded()
      }
    } catch (e) {
      setLoading(false)
      showMsg?.('Error: ' + e.message, 'error')
    }
  }

  const searchTmdb = async (q) => {
    if (!q || q.trim().length < 2) {
      setTmdbResults([])
      return
    }
    setTmdbLoading(true)
    try {
      const url = `/api/tmdb/search?query=${encodeURIComponent(q)}&type=tv`
      console.log('📋 TMDB Series search URL:', url)
      const proxyResp = await fetch(url)
      console.log('📋 TMDB Series response status:', proxyResp.status)
      if (proxyResp.ok) {
        const json = await proxyResp.json()
        const tvOnly = (json.results || []).filter(r => r.media_type === 'tv' || (!r.media_type && (r.name || r.first_air_date)))
        console.log('📋 TMDB Series results:', tvOnly.length, 'found')
        setTmdbResults(tvOnly)
        setTmdbLoading(false)
        return
      } else {
        const errText = await proxyResp.text()
        console.error('❌ TMDB Series search failed:', proxyResp.status, errText)
        showMsg?.('TMDB search failed: ' + proxyResp.status, 'error')
      }
    } catch (e) {
      console.error('❌ TMDB Series search error:', e.message)
      showMsg?.('TMDB search error: ' + e.message, 'error')
    }
    setTmdbLoading(false)
  }

  const onTmdbChange = (v) => {
    setTmdbQuery(v)
    if (tmdbTimer.current) clearTimeout(tmdbTimer.current)
    tmdbTimer.current = setTimeout(() => searchTmdb(v), 300)
  }

  const addSelectedTmdb = async () => {
    if (selectedTmdbIds.size === 0) return showMsg?.('No series selected', 'error')
    const inserts = []
    for (const id of Array.from(selectedTmdbIds)) {
      const r = tmdbResults.find(t => String(t.id) === String(id))
      if (!r) continue
      // Try resolver endpoint first to get a resolved download/detail link
      let resolvedUrl = null
      try {
        const payload = {
          title: (r.name || r.title),
          season: seasonForSelected ? Number(seasonForSelected) : undefined,
          episode: episodeForSelected ? Number(episodeForSelected) : undefined
        }
        const ac = new AbortController()
        const timeout = setTimeout(() => ac.abort(), 20000)
        const resp = await fetch('/api/scraper/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: ac.signal
        })
        clearTimeout(timeout)
        if (resp.ok) {
          const j = await resp.json()
          if (j && j.success && Array.isArray(j.links) && j.links.length > 0) {
            resolvedUrl = j.links[0].url
          }
        } else {
          console.warn('Resolver responded with status', resp.status)
        }
      } catch (e) {
        console.warn('Resolver error for', r.name || r.title, e)
      }

      const fallback = null
      if (resolvedUrl) {
        const poster = r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null
        inserts.push({
          tv_id: Number(r.id),
          series_title: r.name || r.title,
          season_number: seasonForSelected ? Number(seasonForSelected) : 1,
          episode_number: episodeForSelected ? Number(episodeForSelected) : 1,
          title: `${r.name || r.title} S${seasonForSelected || 1}E${episodeForSelected || 1}`,
          url: resolvedUrl,
          poster
        })
      } else {
        console.warn('Skipping series insert for', r.name || r.title, '- no Nkiri link found')
      }
    }
    if (inserts.length === 0) return showMsg?.('No valid TMDB rows', 'error')
    try {
      const { error } = await supabase.from('series_links').insert(inserts)
      if (error) showMsg?.('Failed to add links: ' + (error.message || error), 'error')
      else { setSelectedTmdbIds(new Set()); setTmdbResults([]); setTmdbQuery(''); showMsg?.(`Added ${inserts.length} link(s)`); onAdded() }
    } catch (e) {
      showMsg?.('Error inserting links: ' + (e.message || e), 'error')
    }
  }

  const addSelectedTmdbSeriesAndScrape = async () => {
    if (selectedTmdbIds.size === 0) return showMsg?.('No series selected', 'error')

    // Do NOT insert NewToxic placeholders. Instead, trigger the scraper for each selected
    const { data: session } = await supabase.auth.getSession()
    const token = session?.session?.access_token
    if (!token) return showMsg('Authentication required', 'error')
    let total = 0
    const scrapedIds = []
    for (const id of Array.from(selectedTmdbIds)) {
      const r = tmdbResults.find(t => String(t.id) === String(id))
      if (!r) continue
      try {
        const resp = await fetch(`/api/scraper/episode`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ tvId: Number(r.id), seriesTitle: r.name || r.title, season: Number(seasonForSelected), episode: Number(episodeForSelected) })
        })
        const text = await resp.text()
        let data
        try { data = text ? JSON.parse(text) : {} } catch (e) { data = { _raw: text } }
        if (resp.ok && data && data.success) {
          total += (data.count || 0)
          scrapedIds.push(Number(r.id))
        }
      } catch (e) { console.error('bulk scrape series error', e) }
    }
    showMsg(`Scrape triggered — found ${total} links`)
    setSelectedTmdbIds(new Set())
    setTmdbResults([])
    setTmdbQuery('')

    // Poll for inserted rows and refresh UI once present
    if (scrapedIds.length > 0) {
      await pollForInserts(scrapedIds, 'series_links', 'tv_id')
      fetchSeriesLinks()
    } else {
      fetchSeriesLinks()
    }
    onAdded()
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <input placeholder="Search TMDB series" value={tmdbQuery} onChange={(e) => onTmdbChange(e.target.value)} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', background: '#071021', color: '#e6eef8' }} />
      {tmdbLoading && <div style={{ color: '#9fb0c8' }}>Searching TMDB...</div>}
      {tmdbResults.length > 0 && (
        <div style={{ maxHeight: 200, overflow: 'auto', background: '#071121', padding: 8, borderRadius: 6 }}>
          {tmdbResults.map(r => (
            <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 6 }}>
              <input type="checkbox" checked={selectedTmdbIds.has(String(r.id))} onChange={(e) => { const s = new Set(selectedTmdbIds); if (e.target.checked) s.add(String(r.id)); else s.delete(String(r.id)); setSelectedTmdbIds(s) }} />
              <img src={r.poster_path ? `https://image.tmdb.org/t/p/w92${r.poster_path}` : ''} alt="" style={{ width: 36, height: 54, objectFit: 'cover', borderRadius: 3 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: '#9fb0c8' }}>{r.first_air_date || ''}</div>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => { const s = new Set(tmdbResults.map(r => String(r.id))); setSelectedTmdbIds(s) }} style={{ padding: '6px 10px' }}>Select All</button>
            <button onClick={() => setSelectedTmdbIds(new Set())} style={{ padding: '6px 10px' }}>Clear</button>
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', alignItems: 'center' }}>
              <input value={seasonForSelected} onChange={(e) => setSeasonForSelected(e.target.value)} placeholder="Season" style={{ width: 80, padding: '6px 8px' }} />
              <input value={episodeForSelected} onChange={(e) => setEpisodeForSelected(e.target.value)} placeholder="Episode" style={{ width: 80, padding: '6px 8px' }} />
              <button onClick={addSelectedTmdb} disabled={loading} style={{ padding: '6px 10px' }}>{loading ? 'Adding...' : 'Add Selected'}</button>
              <button onClick={addSelectedTmdbSeriesAndScrape} disabled={loading} style={{ ...primaryButtonStyle }}>{loading ? 'Processing...' : 'Add Selected + Scrape'}</button>
            </div>
          </div>
        </div>
      )}

      <textarea 
        value={csv} 
        onChange={(e) => setCsv(e.target.value)} 
        placeholder="Paste CSV data here (tv_id,series_title,season,episode,url)&#10;Example:&#10;12345,Breaking Bad,1,1,https://example.com/link"
        style={{ 
          padding: '10px', 
          borderRadius: 6, 
          border: '1px solid rgba(255,255,255,0.06)', 
          background: '#071021', 
          color: '#e6eef8',
          fontFamily: 'monospace',
          fontSize: 12,
          minHeight: 140,
          resize: 'vertical'
        }} 
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleBulkAdd} disabled={loading} style={{ ...primaryButtonStyle, background: loading ? '#4b5563' : '#2563eb' }}>{loading ? 'Adding...' : 'Add All (CSV)'}</button>
      </div>
    </div>
  )
}

export default Admin