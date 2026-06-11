import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import GPSGate from '../components/GPSGate'
import { getSession, validateCheckpoint, sendCompletion } from '../lib/api'

const THEME = {
  bg: '#0a0a0a',
  card: '#111',
  accent: '#C8953A',        // gold
  success: '#1D9E75',
  danger: '#991b1b',
  text: '#ffffff',
  textMuted: '#888',
  border: '#222'
}

export default function CheckpointPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  
  const [session, setSession] = useState(null)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [coords, setCoords] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showRiddle, setShowRiddle] = useState(true)

  useEffect(() => {
    const sid = localStorage.getItem('session_id')
    if (!sid) {
      navigate('/')
      return
    }

    getSession(sid).then(data => {
      if (data.error) {
        navigate('/')
        return
      }
      if (data.current_checkpoint?.slug !== slug) {
        navigate('/blocked')
        return
      }
      setSession(data)
    })
  }, [slug, navigate])

  const refreshSession = async () => {
    const sid = localStorage.getItem('session_id')
    const data = await getSession(sid)
    if (!data.error) setSession(data)
  }

  async function handleSubmit() {
    if (!answer.trim() || !coords) return

    setLoading(true)
    setResult(null)

    const sid = localStorage.getItem('session_id')
    const data = await validateCheckpoint({
      session_id: sid,
      checkpoint_slug: slug,
      answer,
      player_lat: coords.lat,
      player_lng: coords.lng
    })

    setLoading(false)

    if (data.success && data.is_complete) {
      sendCompletion(sid).catch(err => console.error('Email error:', err))
      navigate('/complete')
      return
    }

    if (data.success) {
      setResult({
        ok: true,
        message: data.next_clue,
        next: data.next_checkpoint?.slug,
        points: data.points_earned || 10
      })
      setShowSuccess(true)
      await refreshSession() // Ensure we have latest data
    } else {
      setResult({
        ok: false,
        message: data.message || 'Incorrect answer'
      })
    }
  }

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: THEME.bg, color: '#555' }}>
        Loading...
      </div>
    )
  }

  const cp = session.current_checkpoint

  return (
    <div style={{ minHeight: '100vh', padding: '24px', maxWidth: '480px', margin: '0 auto', background: THEME.bg, color: THEME.text }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
        <span style={{ fontSize: '13px', color: THEME.textMuted }}>
          Logbook Page {cp.sequence} of 7
        </span>
        <span style={{ fontSize: '13px', color: THEME.textMuted }}>
          {session.total_points} pts
        </span>
      </div>

      {/* Story */}
      <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '14px', color: '#aaa', lineHeight: '1.75' }}>
          {cp.story_snippet}
        </p>
      </div>

      {/* Riddle Toggle */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => setShowRiddle(!showRiddle)}
          style={{
            background: 'none',
            border: 'none',
            color: THEME.accent,
            fontSize: '14px',
            padding: 0,
            cursor: 'pointer',
            marginBottom: '8px'
          }}
        >
          {showRiddle ? '▼ Hide Clue' : '▶ Show Clue'}
        </button>

        {showRiddle && (
          <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: '12px', padding: '20px' }}>
            <p style={{ fontSize: '16px', fontWeight: '500', lineHeight: '1.6' }}>
              {cp.riddle_text}
            </p>
          </div>
        )}
      </div>

      <GPSGate 
        checkpoint={cp} 
        onReady={(gps) => setCoords(gps)} 
      />

      {coords && (
        <div style={{ marginTop: '24px' }}>
          <input
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Enter your answer..."
            style={{
              width: '100%',
              background: '#111',
              border: `1px solid ${THEME.border}`,
              borderRadius: '12px',
              padding: '16px',
              color: THEME.text,
              fontSize: '17px',
              marginBottom: '12px'
            }}
          />

          <button 
            onClick={handleSubmit} 
            disabled={loading || !answer.trim()}
            style={{
              width: '100%',
              padding: '16px',
              border: 'none',
              borderRadius: '12px',
              background: THEME.accent,
              color: '#000',
              fontSize: '16px',
              fontWeight: '600',
              opacity: loading || !answer.trim() ? 0.6 : 1
            }}
          >
            {loading ? 'Checking...' : 'Submit Answer'}
          </button>

          {result && !result.ok && (
            <div style={{ marginTop: '20px', padding: '16px', borderRadius: '8px', background: '#2d1212', border: `1px solid ${THEME.danger}` }}>
              <p style={{ color: '#fca5a5', margin: '0 0 12px' }}>{result.message}</p>
              <button 
                onClick={() => { setResult(null); setAnswer('') }}
                style={{ width: '100%', padding: '12px', background: THEME.danger, color: '#fff', border: 'none', borderRadius: '8px' }}
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      )}

      {/* Success Overlay */}
      {showSuccess && result?.ok && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(10,10,10,0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '24px'
        }}>
          <div style={{ textAlign: 'center', maxWidth: '420px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📜</div>
            <h2 style={{ fontSize: '28px', marginBottom: '8px', color: THEME.success }}>Page Recovered!</h2>
            
            <div style={{ fontSize: '48px', fontWeight: '700', color: THEME.success, margin: '16px 0' }}>
              +{result.points}
            </div>

            <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#aaa', marginBottom: '32px' }}>
              {result.message}
            </p>

            <button 
              onClick={() => {
                setShowSuccess(false)
                setAnswer('')
                setResult(null)
                if (result.next) {
                  navigate(`/c/${result.next}`)
                } else {
                  navigate('/complete')
                }
              }}
              style={{
                width: '100%',
                padding: '18px',
                background: THEME.success,
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '17px',
                fontWeight: '600'
              }}
            >
              Continue Adventure →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}