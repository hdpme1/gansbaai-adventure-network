import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession } from '../lib/api'

const THEME = {
  bg: '#0a0a0a',
  text: '#ffffff',
  textMuted: '#888'
}

export default function BlockedPage() {
  const navigate = useNavigate()
  const [slug, setSlug] = useState(null)

  useEffect(() => {
    const sid = localStorage.getItem('session_id')
    if (!sid) {
      navigate('/')
      return
    }
    getSession(sid).then(data => {
      if (data.current_checkpoint) setSlug(data.current_checkpoint.slug)
    })
  }, [navigate])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      textAlign: 'center',
      background: THEME.bg,
      color: THEME.text
    }}>
      <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔒</div>
      
      <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px' }}>
        Checkpoint Locked
      </h1>
      
      <p style={{ color: THEME.textMuted, maxWidth: '300px', lineHeight: '1.7', marginBottom: '40px' }}>
        You haven't unlocked this page yet. Follow the clues in the correct order.
      </p>

      {slug && (
        <button
          onClick={() => navigate('/c/' + slug)}
          style={{
            background: '#fff',
            color: '#000',
            border: 'none',
            padding: '16px 32px',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          Go to Current Checkpoint
        </button>
      )}
    </div>
  )
}