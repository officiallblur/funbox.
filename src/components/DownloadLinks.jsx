import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const DownloadLinks = ({ editable = false, movieId = null }) => {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [message, setMessage] = useState(null)
  const [messageType, setMessageType] = useState('success')
  const [showAdminControls, setShowAdminControls] = useState(false)

  const showMsg = (text, type = 'success') => {
    setMessage(text)
    setMessageType(type)
    setTimeout(() => setMessage(null), 4000)
  }

  const fetchLinks = async () => {
    setLoading(true)
    try {
      let query = supabase.from('download_links').select('*').order('created_at', { ascending: false })
      if (movieId !== null && movieId !== undefined) query = query.eq('movie_id', movieId)
      const { data, error } = await query
      if (error) {
        console.error('Error fetching download links', error)
        showMsg('Failed to load download links', 'error')
        setLinks([])
      } else {
        setLinks(data || [])
      }
    } catch (err) {
      console.error('Unexpected error fetching links', err)
      showMsg('Failed to load download links', 'error')
      setLinks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLinks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieId])

  const handleAdd = async () => {
    if (!title.trim() || !url.trim()) return
    const payload = { title: title.trim(), url: url.trim() }
    if (movieId !== null && movieId !== undefined) payload.movie_id = movieId
    const { error } = await supabase.from('download_links').insert([payload])
    if (error) {
      console.error('Error inserting link', error)
      showMsg('Failed to add link', 'error')
    } else {
      setTitle('')
      setUrl('')
      showMsg('Link added', 'success')
      fetchLinks()
    }
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('download_links').delete().eq('id', id)
    if (error) {
      console.error('Error deleting link', error)
      showMsg('Failed to delete link', 'error')
    } else {
      showMsg('Link deleted', 'success')
      fetchLinks()
    }
  }

  if (loading) return <div>Loading download links...</div>

  return (
    <div style={{ width: '100%', marginTop: '24px' }}>
      <h2>Download Links</h2>
      {editable && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input placeholder="URL" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button onClick={handleAdd}>Add</button>
          <button onClick={() => setShowAdminControls((s) => !s)}>{showAdminControls ? 'Hide' : 'Admin'}</button>
        </div>
      )}

      {message && (
        <div style={{ padding: 8, marginBottom: 8, borderRadius: 6, background: messageType === 'success' ? '#2d6a4f' : '#7f1d1d', color: '#fff' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gap: '8px' }}>
        {links.length === 0 && <p>No download links available.</p>}
        {links.map((l) => (
          <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e1e1e', padding: '8px', borderRadius: '6px' }}>
            <a href={l.url} target="_blank" rel="noreferrer" style={{ color: '#f9d3b4' }}>{l.title || l.url}</a>
            {editable && <button onClick={() => handleDelete(l.id)} style={{ background: 'transparent' }}>Delete</button>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default DownloadLinks
