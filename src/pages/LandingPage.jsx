import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdventure, getSession, listAdventures, listRegions } from '../lib/api'
import { getSessionForAdventure, setActiveSessionId } from '../lib/session'
import { L, D, ROUTE_BLUE, UNLOCK_LIME, NIGHT_INK, MAP_CREAM, btnPrimary, btnOutline, WEIGHT } from '../lib/theme'

// "/" with no ?adventure= param → hub (all chases).
// "/?adventure=<slug>"          → single chase landing + resume flow.
export default function LandingPage() {
  const navigate = useNavigate()
  const params = new URLSearchParams(window.location.search)
  const adventureSlug = params.get('adventure')

  if (!adventureSlug) return <ChaseHub navigate={navigate} />
  return <SingleChaseLanding adventureSlug={adventureSlug} navigate={navigate} />
}

// ── Hub — all available Chases ───────────────────────────────────────────────
function ChaseHub({ navigate }) {
  const [adventures, setAdventures]     = useState(null)
  const [regions, setRegions]           = useState([])
  const [activeRegion, setActiveRegion] = useState(null)
  const [errored, setErrored]           = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([listRegions(), listAdventures()])
      .then(([regionData, advData]) => {
        if (cancelled) return
        if (advData.error) { setErrored(true); return }
        setRegions(regionData.regions || [])
        setAdventures(advData.adventures || [])
      })
      .catch(() => { if (!cancelled) setErrored(true) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (adventures === null) return
    let cancelled = false
    setAdventures(null)
    listAdventures(activeRegion || undefined)
      .then(data => { if (!cancelled) setAdventures(data.adventures || []) })
      .catch(() => { if (!cancelled) setErrored(true) })
    return () => { cancelled = true }
  }, [activeRegion])

  const showRegionFilter = regions.length > 1

  if (errored) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '32px', background: MAP_CREAM, color: L.muted, textAlign: 'center' }}>
      Couldn't load right now — try refreshing.
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: MAP_CREAM, color: NIGHT_INK,
      padding: '56px 24px 40px', maxWidth: '540px', margin: '0 auto' }}>

      {/* Wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px' }}>
        <span style={{ fontSize: '22px', fontWeight: WEIGHT.black, letterSpacing: '-.02em', color: NIGHT_INK }}>
          PLAYCE
        </span>
        <span style={{ fontSize: '11px', fontWeight: WEIGHT.semiBold, color: L.muted,
          letterSpacing: '.08em', textTransform: 'uppercase', marginTop: '2px' }}>
          Explore towns. Play places.
        </span>
      </div>

      <p style={{ fontSize: '11px', fontWeight: WEIGHT.semiBold, color: L.muted,
        letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
        Choose your next
      </p>
      <h1 style={{ fontSize: '36px', fontWeight: WEIGHT.black, letterSpacing: '-.03em',
        textTransform: 'uppercase', marginBottom: showRegionFilter ? '24px' : '32px', lineHeight: 1.05 }}>
        PLAYCE.
      </h1>

      {/* Region filter pills */}
      {showRegionFilter && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '28px' }}>
          <button onClick={() => setActiveRegion(null)} style={{
            padding: '7px 18px', borderRadius: '100px', fontSize: '13px',
            fontWeight: WEIGHT.semiBold, border: 'none', cursor: 'pointer',
            background: activeRegion === null ? NIGHT_INK : L.surfaceAlt,
            color: activeRegion === null ? '#fff' : L.muted,
          }}>All</button>
          {regions.map(r => (
            <button key={r.slug} onClick={() => setActiveRegion(r.slug === activeRegion ? null : r.slug)} style={{
              padding: '7px 18px', borderRadius: '100px', fontSize: '13px',
              fontWeight: WEIGHT.semiBold, border: 'none', cursor: 'pointer',
              background: activeRegion === r.slug ? NIGHT_INK : L.surfaceAlt,
              color: activeRegion === r.slug ? '#fff' : L.muted,
            }}>{r.name}</button>
          ))}
        </div>
      )}

      {!adventures && (
        <p style={{ color: L.muted, textAlign: 'center', padding: '40px 0' }}>Loading...</p>
      )}

      {adventures?.length === 0 && (
        <p style={{ color: L.muted, textAlign: 'center', padding: '40px 0' }}>
          No chases available right now — check back soon.
        </p>
      )}

      {/* Chase cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {adventures?.map((adv, i) => (
          <button key={adv.slug}
            onClick={() => navigate('/?adventure=' + adv.slug)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '16px', textAlign: 'left',
              background: i === 0 ? ROUTE_BLUE : '#FFFFFF',
              border: i === 0 ? 'none' : `1.5px solid ${L.border}`,
              borderRadius: '16px', padding: '20px 20px', cursor: 'pointer',
              color: i === 0 ? '#fff' : NIGHT_INK,
            }}
          >
            <div style={{ fontSize: '32px', flexShrink: 0, lineHeight: 1 }}>{adv.icon || '🧭'}</div>
            <div style={{ flex: 1 }}>
              {adv.region && showRegionFilter && (
                <p style={{ fontSize: '10px', fontWeight: WEIGHT.semiBold,
                  color: i === 0 ? 'rgba(255,255,255,0.65)' : L.muted,
                  letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>
                  {adv.region.name}
                </p>
              )}
              <p style={{ fontSize: '17px', fontWeight: WEIGHT.black,
                letterSpacing: '-.01em', textTransform: 'uppercase', margin: '0 0 6px', lineHeight: 1.1 }}>
                {adv.name}
              </p>
              <p style={{
                fontSize: '13px', lineHeight: '1.5', margin: 0,
                color: i === 0 ? 'rgba(255,255,255,0.75)' : L.muted,
                display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical', overflow: 'hidden'
              }}>
                {adv.story_intro}
              </p>
              {i === 0 && (
                <span style={{ display: 'inline-block', marginTop: '14px', padding: '8px 20px',
                  background: UNLOCK_LIME, color: NIGHT_INK, borderRadius: '100px',
                  fontSize: '12px', fontWeight: WEIGHT.semiBold, letterSpacing: '.05em',
                  textTransform: 'uppercase' }}>
                  Start the Chase →
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: '28px' }}>
        <button onClick={() => navigate('/collection')}
          style={{ background: 'none', border: 'none', color: L.muted,
            fontSize: '13px', cursor: 'pointer', textDecoration: 'underline',
            fontFamily: 'Inter, sans-serif' }}>
          My Display Case
        </button>
      </div>
    </div>
  )
}

// ── Single chase landing + resume ────────────────────────────────────────────
function SingleChaseLanding({ adventureSlug, navigate }) {
  const [adventure, setAdventure] = useState(null)
  const [notFound, setNotFound]   = useState(false)
  const [checking, setChecking]   = useState(true)

  useEffect(() => {
    let cancelled = false
    setChecking(true)
    setAdventure(null)
    setNotFound(false)

    async function init() {
      const sid = getSessionForAdventure(adventureSlug)
      if (sid) {
        try {
          const sess = await getSession(sid)
          if (sess && !sess.error && !cancelled && sess.adventure?.slug === adventureSlug) {
            setActiveSessionId(sid)
            if (sess.status === 'COMPLETE') { setChecking(false); navigate('/complete'); return }
            if (sess.current_checkpoint?.slug) {
              setChecking(false)
              navigate('/c/' + sess.current_checkpoint.slug)
              return
            }
          }
        } catch (e) { console.error('Session sync issue:', e) }
      }

      try {
        const adv = await getAdventure(adventureSlug)
        if (cancelled) return
        if (!adv || adv.error) { setNotFound(true) }
        else { setAdventure(adv) }
      } catch { if (!cancelled) setNotFound(true) }
      finally { if (!cancelled) setChecking(false) }
    }

    init()
    return () => { cancelled = true }
  }, [adventureSlug, navigate])

  if (checking) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: MAP_CREAM, color: L.muted }}>
      <p style={{ fontSize: '13px', fontWeight: WEIGHT.semiBold, letterSpacing: '.08em',
        textTransform: 'uppercase' }}>Loading...</p>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '32px', background: MAP_CREAM, textAlign: 'center' }}>
      <p style={{ color: L.muted, marginBottom: '24px' }}>This chase isn't available right now.</p>
      <button onClick={() => navigate('/')} style={btnPrimary({ width: 'auto', padding: '12px 28px' })}>
        Back to PLAYCE
      </button>
    </div>
  )

  if (!adventure) return null

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: MAP_CREAM, color: NIGHT_INK }}>

      {/* Hero */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '56px 32px 32px', textAlign: 'center', maxWidth: '480px',
        margin: '0 auto', width: '100%' }}>

        <div style={{ fontSize: '64px', marginBottom: '20px' }}>{adventure.icon || '🧭'}</div>

        <p style={{ fontSize: '11px', fontWeight: WEIGHT.semiBold, color: ROUTE_BLUE,
          letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
          PLAYCE Chase
        </p>
        <h1 style={{ fontSize: '36px', fontWeight: WEIGHT.black, letterSpacing: '-.03em',
          textTransform: 'uppercase', marginBottom: '16px', lineHeight: 1.05 }}>
          {adventure.name}
        </h1>
        <p style={{ fontSize: '16px', color: L.muted, maxWidth: '340px', lineHeight: '1.65',
          marginBottom: '48px' }}>
          {adventure.story_intro}
        </p>

        <button onClick={() => navigate('/register?adventure=' + adventureSlug)}
          style={btnPrimary()}>
          Start the Chase.
        </button>
      </div>

      {/* Footer tag */}
      <div style={{ textAlign: 'center', padding: '20px 0 32px' }}>
        <p style={{ fontSize: '11px', fontWeight: WEIGHT.semiBold, color: L.faint,
          letterSpacing: '.08em', textTransform: 'uppercase' }}>
          The town is the game board.
        </p>
      </div>
    </div>
  )
}