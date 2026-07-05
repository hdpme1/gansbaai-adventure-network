import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession } from '../lib/api'
import { getActiveSessionId } from '../lib/session'
import { D, NIGHT_INK, UNLOCK_LIME, ROUTE_BLUE, SIGNAL_CORAL, WEIGHT } from '../lib/theme'

const pill = (custom = {}) => ({
  width: '100%', padding: '16px 24px', borderRadius: '100px',
  fontSize: '15px', fontWeight: WEIGHT.semiBold, letterSpacing: '.06em',
  textTransform: 'uppercase', cursor: 'pointer', border: 'none',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  ...custom
})

export default function CompletePage() {
  const navigate  = useNavigate()
  const bgAudioRef = useRef(null)

  const [session,  setSession]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    return () => {
      if (bgAudioRef.current) { bgAudioRef.current.pause(); bgAudioRef.current = null }
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const sid = new URLSearchParams(window.location.search).get('sid')
        || getActiveSessionId()
      if (!sid) { if (!cancelled) { setNotFound(true); setLoading(false) }; return }
      try {
        const data = await getSession(sid)
        if (cancelled) return
        if (data.error || data.status !== 'COMPLETE') { navigate('/'); return }
        setSession(data)
        if (data.adventure?.ambient_audio_url && !bgAudioRef.current) {
          bgAudioRef.current = new Audio(data.adventure.ambient_audio_url)
          bgAudioRef.current.loop   = true
          bgAudioRef.current.volume = 0.2
          bgAudioRef.current.play().catch(() => {})
        }
        setLoading(false)
      } catch {
        if (!cancelled) { setNotFound(true); setLoading(false) }
      }
    }
    load()
    return () => { cancelled = true }
  }, [navigate])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: NIGHT_INK, color: '#8A8A9A' }}>
      <p>Tallying your score...</p>
    </div>
  )

  if (notFound || !session) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '32px',
      textAlign: 'center', background: NIGHT_INK, color: '#8A8A9A' }}>
      <p style={{ marginBottom: '24px', fontSize: '15px' }}>
        No completed Chase found for this device.
      </p>
      <button onClick={() => navigate('/')} style={pill({ background: ROUTE_BLUE, color: '#fff', width: 'auto', padding: '14px 32px' })}>
        Back to PLAYCE
      </button>
    </div>
  )

  const rewards = session.rewards || []

  return (
    <div className="reveal-transition" style={{ minHeight: '100vh', background: NIGHT_INK,
      color: '#fff', padding: '40px 24px', maxWidth: '480px', margin: '0 auto' }}>

      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '32px', paddingTop: '16px' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>🏆</div>
        <h1 className="font-display" style={{ fontSize: '44px', color: UNLOCK_LIME,
          margin: '0 0 8px', lineHeight: 1 }}>
          TOWN<br />CRACKED.
        </h1>
        <p style={{ fontSize: '15px', color: '#8A8A9A', margin: '8px 0 0' }}>
          {session.adventure?.name}
        </p>
      </div>

      {/* Score */}
      <div style={{ textAlign: 'center', marginBottom: '32px',
        background: D.surface, border: `1.5px solid ${UNLOCK_LIME}40`,
        padding: '24px', borderRadius: '16px' }}>
        <span style={{ display: 'block', fontSize: '11px', fontWeight: WEIGHT.semiBold,
          color: UNLOCK_LIME, letterSpacing: '.1em', textTransform: 'uppercase',
          marginBottom: '8px', opacity: 0.7 }}>Final Score</span>
        <span style={{ fontSize: '48px', fontWeight: WEIGHT.black, color: UNLOCK_LIME }}>
          {session.total_points || 0}
        </span>
        <span style={{ fontSize: '14px', color: UNLOCK_LIME, opacity: 0.7, marginLeft: '6px' }}>
          pts
        </span>
      </div>

      {/* Story outro */}
      {session.adventure?.story_outro && (
        <div style={{ fontSize: '16px', lineHeight: '1.75', color: '#e0e0e0',
          background: D.surface, padding: '24px', borderRadius: '14px',
          border: `1px solid ${D.border}`, marginBottom: '32px' }}>
          "{session.adventure.story_outro}"
        </div>
      )}

      {/* Rewards */}
      {rewards.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <span style={{ display: 'block', fontSize: '11px', fontWeight: WEIGHT.semiBold,
            color: ROUTE_BLUE, letterSpacing: '.1em', textTransform: 'uppercase',
            marginBottom: '12px' }}>
            Your Rewards
          </span>
          {rewards.map((r, i) => (
            <div key={i} style={{ background: D.surface, border: `1px solid ${D.border}`,
              borderRadius: '12px', padding: '16px', marginBottom: '10px' }}>
              <p style={{ fontSize: '14px', fontWeight: WEIGHT.semiBold, color: '#fff',
                margin: '0 0 4px' }}>{r.partner?.name || 'Partner Reward'}</p>
              {r.partner?.reward_description && (
                <p style={{ fontSize: '13px', color: D.muted, margin: '0 0 10px',
                  lineHeight: '1.5' }}>{r.partner.reward_description}</p>
              )}
              <div style={{ display: 'inline-block', background: NIGHT_INK,
                border: `1.5px dashed ${UNLOCK_LIME}`, borderRadius: '8px',
                padding: '8px 14px', fontSize: '15px', fontWeight: WEIGHT.black,
                color: UNLOCK_LIME, letterSpacing: '.08em' }}>
                {r.code}
              </div>
              {r.claimed_at && (
                <p style={{ fontSize: '11px', color: D.muted, margin: '8px 0 0' }}>
                  Already redeemed
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <button onClick={() => navigate('/')}
        style={pill({ background: ROUTE_BLUE, color: '#fff' })}>
        Back to PLAYCE
      </button>

      <button onClick={() => navigate('/collection')}
        style={pill({ background: 'transparent', color: D.muted,
          border: `1.5px solid ${D.border}`, marginTop: '12px' })}>
        My Display Case
      </button>
    </div>
  )
}