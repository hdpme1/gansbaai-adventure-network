import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession } from '../lib/api'

const T = {
  bg: '#0a0a0a',
  surface: '#111111',
  border: '#1f1f1f',
  accent: '#C8953A',
  text: '#ffffff',
  muted: '#888888',
  successBg: '#062419',
  successBorder: '#10593e',
  successText: '#86efac',
}

export default function CompletePage() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const sid = localStorage.getItem('session_id')
      if (!sid) {
        if (!cancelled) { setNotFound(true); setLoading(false) }
        return
      }

      try {
        const data = await getSession(sid)
        if (cancelled) return

        // If the session isn't actually marked COMPLETE, this page was
        // reached incorrectly (e.g. stale link) — send the player back to
        // their real current spot rather than showing a blank summary.
        if (data.error || data.status !== 'COMPLETE') {
          navigate('/')
          return
        }

        setSession(data)
        setLoading(false)
      } catch (e) {
        if (!cancelled) { setNotFound(true); setLoading(false) }
      }
    }

    load()
    return () => { cancelled = true }
  }, [navigate])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, color: T.muted }}>
      Compiling your logbook...
    </div>
  )

  if (notFound || !session) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center', background: T.bg, color: T.muted }}>
      <p style={{ marginBottom: '24px' }}>We couldn't find a completed adventure for this device.</p>
      <button onClick={() => navigate('/')} style={{
        background: T.accent, color: '#000', border: 'none', borderRadius: '12px',
        padding: '14px 28px', fontSize: '15px', fontWeight: '600', cursor: 'pointer'
      }}>
        Back to Start
      </button>
    </div>
  )

  const rewards = session.rewards || []

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, padding: '40px 24px', maxWidth: '480px', margin: '0 auto' }}>

      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>🏆</div>
        <h1 className="font-serif" style={{ fontSize: '30px', fontWeight: '600', marginBottom: '8px' }}>
          Logbook Complete
        </h1>
        <p style={{ fontSize: '15px', color: T.muted }}>
          {session.adventure?.name}
        </p>
      </div>

      <div style={{
        textAlign: 'center', marginBottom: '32px', background: T.successBg,
        border: `1px solid ${T.successBorder}`, padding: '24px', borderRadius: '14px'
      }}>
        <span style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: T.successText, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '8px', opacity: 0.8 }}>
          Final Score
        </span>
        <span style={{ fontSize: '40px', fontWeight: '700', color: T.successText }}>
          {session.total_points || 0}
        </span>
        <span style={{ fontSize: '14px', color: T.successText, opacity: 0.8, marginLeft: '6px' }}>pts</span>
      </div>

      {session.adventure?.story_outro && (
        <div className="font-serif" style={{
          fontSize: '16px', lineHeight: '1.75', color: '#e0e0e0', background: T.surface,
          padding: '24px', borderRadius: '14px', border: `1px solid ${T.border}`,
          marginBottom: '32px', fontStyle: 'italic'
        }}>
          "{session.adventure.story_outro}"
        </div>
      )}

      {rewards.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <span style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: T.accent, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Your Rewards
          </span>
          {rewards.map((r, i) => (
            <div key={i} style={{
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: '12px',
              padding: '16px', marginBottom: '10px'
            }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: T.text, margin: '0 0 4px' }}>
                {r.partner?.name || 'Partner Reward'}
              </p>
              {r.partner?.reward_description && (
                <p style={{ fontSize: '13px', color: T.muted, margin: '0 0 10px', lineHeight: '1.5' }}>
                  {r.partner.reward_description}
                </p>
              )}
              <div style={{
                display: 'inline-block', background: T.bg, border: `1px dashed ${T.accent}`,
                borderRadius: '8px', padding: '8px 14px', fontSize: '15px', fontWeight: '700',
                color: T.accent, letterSpacing: '.05em'
              }}>
                {r.code}
              </div>
              {r.claimed_at && (
                <p style={{ fontSize: '11px', color: T.muted, margin: '8px 0 0' }}>Already redeemed</p>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => navigate('/')}
        style={{
          width: '100%', padding: '16px', background: T.accent, color: '#000', border: 'none',
          borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer'
        }}>
        Back to Gansbaai Adventures
      </button>
    </div>
  )
}