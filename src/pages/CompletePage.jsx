import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession } from '../lib/api'

const T = {
  bg:           '#0a0a0a',
  surface:      '#111111',
  border:       '#1f1f1f',
  surfaceAlt:   '#1a1a1a',
  text:         '#ffffff',
  muted:        '#888888',
  faint:        '#444444',
  accent:       '#C8953A',
  accentDim:    '#7a5a22',
  success:      '#1D9E75',
  successBg:    '#052e16',
  successBorder:'#166534',
  successText:  '#86efac',
}

function formatTime(minutes) {
  if (!minutes || minutes <= 0) return 'Under a minute'
  if (minutes < 60) return minutes + ' mins'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h + 'h' + (m > 0 ? ' ' + m + 'm' : '')
}

export default function CompletePage() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [copied, setCopied]   = useState(null)

  useEffect(() => {
    const sid = localStorage.getItem('session_id')
    if (!sid) { navigate('/'); return }

    getSession(sid).then(data => {
      if (data.error) { navigate('/'); return }
      setSession(data)
    })
  }, [])

  function copyCode(code) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  function handleReset() {
    // Safely preserve the active adventure context before clearing session state
    const currentSlug = session?.adventure_slug || 'the-tideline-survey'
    localStorage.clear()
    navigate(`/?adventure=${currentSlug}`)
  }

  if (!session) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.faint }}>
      Loading summary...
    </div>
  )

  const rewards = session.rewards || []

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, padding: '48px 24px 32px', maxWidth: '480px', margin: '0 auto' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>🏆</div>
        <h1 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
          Adventure Complete!
        </h1>
        <p style={{ fontSize: '15px', color: T.muted, lineHeight: '1.6', margin: 0 }}>
          Outstanding work, <span style={{ color: T.text, fontWeight: '600' }}>{session.player_name || 'Explorer'}</span>. You have mapped the routes and logged every discovery.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '32px' }}>
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: T.accent, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Final Score
          </span>
          <span style={{ fontSize: '24px', fontWeight: '700', color: T.text }}>
            {session.total_points} <span style={{ fontSize: '13px', color: T.muted, fontWeight: '400' }}>PTS</span>
          </span>
        </div>
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: T.accent, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Time Elapsed
          </span>
          <span style={{ fontSize: '20px', fontWeight: '700', color: T.text, lineHeight: '1.45' }}>
            {formatTime(session.duration_minutes)}
          </span>
        </div>
      </div>

      <h2 style={{ fontSize: '13px', fontWeight: '700', color: T.muted, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
        Your Unlocked Vouchers ({rewards.length})
      </h2>

      {rewards.length === 0 ? (
        <p style={{ fontSize: '14px', color: T.faint, fontStyle: 'italic', margin: '0 0 32px' }}>
          No promotional loot vouchers are attached to this adventure.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px' }}>
          {rewards.map((r, i) => (
            <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '14px', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: '600', margin: '0 0 2px' }}>{r.title}</p>
                  <p style={{ fontSize: '13px', color: T.muted, margin: 0, lineHeight: '1.5' }}>{r.description}</p>
                </div>
                {r.claimed_at && (
                  <span style={{ fontSize: '10px', fontWeight: '700', color: T.success, background: T.successBg, border: `1px solid ${T.successBorder}`, padding: '4px 8px', borderRadius: '6px', whiteSpace: 'nowrap', letterSpacing: '.05em' }}>
                    REDEEMED
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                <div style={{ flex: 1, background: T.surfaceAlt, borderRadius: '8px', padding: '12px 14px', border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: '700', letterSpacing: '.12em', color: T.accent }}>
                    {r.code}
                  </span>
                </div>
                <button onClick={() => copyCode(r.code)}
                  style={{ background: copied === r.code ? T.success : T.surfaceAlt, border: `1px solid ${copied === r.code ? T.success : T.border}`, borderRadius: '8px', color: copied === r.code ? '#fff' : T.text, padding: '0 20px', fontSize: '13px', cursor: 'pointer', transition: 'all .15s', fontWeight: '600' }}>
                  {copied === r.code ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p style={{ color: T.faint, fontSize: '12px', textAlign: 'center', lineHeight: '1.6', margin: '0 0 24px' }}>
        Show reward cards to local shop partners to claim. Progress saved locally on this logbook profile.
      </p>

      <button onClick={handleReset}
        style={{ width: '100%', padding: '16px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: '12px', color: T.muted, fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
        Clear Logbook & Start Anew
      </button>
    </div>
  )
}