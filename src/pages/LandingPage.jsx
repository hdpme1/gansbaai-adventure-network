import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdventure, getSession, listAdventures } from '../lib/api'
import { getSessionForAdventure, setActiveSessionId } from '../lib/session'

const THEME = {
  bg: '#0a0a0a',
  accent: '#C8953A',
  text: '#ffffff',
  textMuted: '#888'
}

// "/" with no ?adventure= param shows the hub (pick an adventure).
// "/?adventure=<slug>" shows that adventure's own intro/register flow.
// No more silent fallback to a hardcoded adventure — that fallback existed
// for old QR codes with no param, but every QR code now carries one, so it
// was only ever masking dead ends like the Complete page's "back" button.
export default function LandingPage() {
  const navigate = useNavigate()
  const adventureSlug = new URLSearchParams(window.location.search).get('adventure')

  if (!adventureSlug) {
    return <AdventureHub navigate={navigate} />
  }

  return <SingleAdventureLanding adventureSlug={adventureSlug} navigate={navigate} />
}

function AdventureHub({ navigate }) {
  const [adventures, setAdventures] = useState(null)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    let cancelled = false
    listAdventures()
      .then(data => {
        if (cancelled) return
        if (data.error) {
          setErrored(true)
        } else {
          setAdventures(data.adventures || [])
        }
      })
      .catch(() => { if (!cancelled) setErrored(true) })
    return () => { cancelled = true }
  }, [])

  if (errored) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center', background: THEME.bg, color: THEME.textMuted }}>
      Couldn't load adventures right now — try refreshing.
    </div>
  )

  if (!adventures) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: THEME.bg, color: THEME.textMuted }}>
      Loading adventures...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', padding: '56px 24px', background: THEME.bg, color: THEME.text, maxWidth: '560px', margin: '0 auto' }}>
      <h1 className="font-serif" style={{ fontSize: '30px', fontWeight: '600', marginBottom: '8px', textAlign: 'center', letterSpacing: '-0.3px' }}>
        Gansbaai Adventures
      </h1>
      <p style={{ fontSize: '14px', color: THEME.textMuted, textAlign: 'center', marginBottom: '40px' }}>
        Pick a logbook to begin.
      </p>

      {adventures.length === 0 && (
        <p style={{ textAlign: 'center', color: THEME.textMuted }}>
          No adventures available right now — check back soon.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {adventures.map(adv => (
          <button
            key={adv.slug}
            onClick={() => navigate('/?adventure=' + adv.slug)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '16px',
              textAlign: 'left',
              background: '#111',
              border: '1px solid #222',
              borderRadius: '14px',
              padding: '20px',
              cursor: 'pointer',
              color: THEME.text
            }}
          >
            <div style={{ fontSize: '36px', flexShrink: 0, lineHeight: 1 }}>{adv.icon || '🧭'}</div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '6px' }}>{adv.name}</div>
              <div style={{
                fontSize: '13px',
                color: THEME.textMuted,
                lineHeight: '1.5',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {adv.story_intro}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function SingleAdventureLanding({ adventureSlug, navigate }) {
  const [adventure, setAdventure] = useState(null)
  const [notFound, setNotFound]   = useState(false)
  const [checking, setChecking]   = useState(true)

  useEffect(() => {
    let cancelled = false
    setChecking(true)
    setAdventure(null)
    setNotFound(false)

    async function init() {
      // Adventure-scoped lookup — this adventure's session_id only, so
      // finishing or starting a different adventure on this device never
      // overwrites or shadows this one.
      const sid = getSessionForAdventure(adventureSlug)
      if (sid) {
        try {
          const sess = await getSession(sid)
          if (sess && !sess.error && !cancelled) {
            // Belt-and-braces: confirm the fetched session really does
            // belong to this adventure before acting on it.
            if (sess.adventure?.slug === adventureSlug) {
              // Keep the generic "active" pointer in sync so CheckpointPage
              // and CompletePage (which don't know the adventure slug yet)
              // pick up this session too.
              setActiveSessionId(sid)

              if (sess.status === 'COMPLETE') {
                setChecking(false)
                navigate('/complete')
                return
              }

              if (sess.current_checkpoint?.slug) {
                setChecking(false)
                navigate('/c/' + sess.current_checkpoint.slug)
                return
              }
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center', background: THEME.bg, color: THEME.textMuted }}>
      <p style={{ marginBottom: '24px' }}>This adventure isn't available right now.</p>
      <button onClick={() => navigate('/')} style={{
        background: THEME.accent, color: '#000', border: 'none', borderRadius: '12px',
        padding: '14px 28px', fontSize: '15px', fontWeight: '600', cursor: 'pointer'
      }}>
        See all adventures
      </button>
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