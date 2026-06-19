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
  const [checking, setChecking]   = useState(true)

  const adventureSlug = new URLSearchParams(window.location.search).get('adventure') || 'lost-shark-logbook'

  useEffect(() => {
    let cancelled = false
    setChecking(true)
    setAdventure(null)
    setNotFound(false)

    async function init() {
      const sid = localStorage.getItem('session_id')
      if (sid) {
        try {
          const sess = await getSession(sid)
          if (sess && !sess.error && !cancelled) {
            // Force route straight to complete layout if already tagged done
            if (sess.completed_at) {
              setChecking(false)
              navigate('/complete')
              return
            }
            
            // Resume mid-flight checkpoint if active
            if (sess.adventure_slug === adventureSlug && sess.current_checkpoint_id) {
              setChecking(false)
              navigate('/c/' + sess.current_checkpoint_id)
              return
            }
          }
        } catch (e) {
          console.error("Session sync issue:", e)
        }
      }

      // Load specific theme schema metadata
      try {
        const adv = await getAdventure(adventureSlug)
        if (cancelled) return
        if (!adv || adv.error) {
          setNotFound(true)
        } else {
          setAdventure(adv)
        }
      } catch (err) {
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setChecking(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [adventureSlug, navigate])

  if (checking) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: THEME.bg, color: THEME.textMuted }}>
      Synchronizing logbook state...
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center', background: THEME.bg, color: THEME.textMuted }}>
      This adventure isn't available right now.
    </div>
  )

  if (!adventure) return null

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center', background: THEME.bg, color: THEME.text, maxWidth: '480px', margin: '0 auto' }}>
      <div style={{ fontSize: '64px', marginBottom: '24px' }}>{adventure.icon || '🧭'}</div>

      <h1 className="font-serif" style={{ fontSize: '34px', fontWeight: '600', marginBottom: '16px', letterSpacing: '-0.3px' }}>
        {adventure.name}
      </h1>

      <p style={{ fontSize: '15px', color: THEME.textMuted, maxWidth: '380px', lineHeight: '1.7', marginBottom: '48px' }}>
        {adventure.story_intro}
      </p>

      <button
        onClick={() => navigate('/register?adventure=' + adventureSlug)}
        style={{ width: '100%', padding: '16px', background: THEME.accent, color: '#000', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
        Begin Logbook Entry →
      </button>
    </div>
  )
}