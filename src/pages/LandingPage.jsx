import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdventure, getSession } from '../lib/api'

const THEME = {
  bg: '#0a0a0a',
  accent: '#C8953A',
  text: '#ffffff',
  textMuted: '#888'
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [adventure, setAdventure] = useState(null)
  const [notFound, setNotFound]   = useState(false)
  const [checking, setChecking]   = useState(true)  // checking for an existing session before showing intro

  // Which adventure this landing page represents — from the QR code's URL.
  // Defaults to the original adventure so existing QR codes with no
  // ?adventure= param keep working exactly as before.
  const adventureSlug = new URLSearchParams(window.location.search).get('adventure') || 'lost-shark-logbook'

  useEffect(() => {
    let cancelled = false
    setChecking(true)
    setAdventure(null)
    setNotFound(false)

    async function init() {
      // ── Resume check: if this device already has a session for THIS
      //    adventure, skip the marketing intro entirely and drop the player
      //    straight back where they left off. Handles a killed tab, a closed
      //    browser, or just coming back the next day. ──
      const sid = localStorage.getItem('session_id')
      if (sid) {
        const session = await getSession(sid)
        if (cancelled) return
        if (!session.error && session.adventure?.slug === adventureSlug) {
          if (session.status === 'COMPLETE') {
            navigate('/complete')
            return
          }
          if (session.current_checkpoint?.slug) {
            navigate('/c/' + session.current_checkpoint.slug)
            return
          }
          // Session exists but is in a state we can't route from cleanly —
          // fall through and show the normal landing page as a safety net.
        }
      }

      // ── No resumable session for this adventure — show the normal intro ──
      const data = await getAdventure(adventureSlug)
      if (cancelled) return
      if (data.error) { setNotFound(true); setChecking(false); return }
      setAdventure(data)
      setChecking(false)
    }

    init()
    return () => { cancelled = true }
  }, [adventureSlug])

  if (checking) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: THEME.bg, color: THEME.textMuted,
    }}>
      Loading...
    </div>
  )

  if (notFound) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px', textAlign: 'center', background: THEME.bg, color: THEME.textMuted,
    }}>
      This adventure isn't available right now.
    </div>
  )

  if (!adventure) return null

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px',
      textAlign: 'center',
      background: THEME.bg,
      color: THEME.text
    }}>
      <div style={{ fontSize: '64px', marginBottom: '24px' }}>{adventure.icon || '🧭'}</div>

      <h1 style={{
        fontSize: '32px',
        fontWeight: '600',
        marginBottom: '16px',
        letterSpacing: '-0.5px'
      }}>
        {adventure.name}
      </h1>

      <p style={{
        fontSize: '15px',
        color: THEME.textMuted,
        maxWidth: '380px',
        lineHeight: '1.7',
        marginBottom: '48px'
      }}>
        {adventure.story_intro}
      </p>

      <button
        onClick={() => navigate('/register?adventure=' + adventureSlug)}
        style={{
          background: '#fff',
          color: '#000',
          border: 'none',
          padding: '16px 40px',
          borderRadius: '12px',
          fontSize: '17px',
          fontWeight: '600',
          cursor: 'pointer'
        }}
      >
        Begin the Hunt
      </button>
    </div>
  )
}