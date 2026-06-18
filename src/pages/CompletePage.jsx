import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession } from '../lib/api'

// ─── Theme ─────────────────────────────────────────────────────────────────────
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
  if (minutes < 60) return minutes + ' min'
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
      if (data.status !== 'COMPLETE') { navigate('/'); return }
      setSession(data)
    })
  }, [])

  async function copyCode(code) {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(code)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // Clipboard not available on some mobile browsers — silent fail
    }
  }

  if (!session) return null

  const mins    = Math.round((Date.now() - new Date(session.started_at)) / 60000)
  const rewards = session.rewards || []

  return (
    <div style={{ minHeight: '100vh', padding: '32px 24px',
      maxWidth: '480px', margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '52px', marginBottom: '16px' }}>🏆</div>
        <h1 style={{ fontSize: '24px', fontWeight: '600', margin: '0 0 6px' }}>
          Adventure complete!
        </h1>
        <p style={{ color: T.muted, fontSize: '14px', margin: 0 }}>
          You solved {session.adventure?.name ? `the ${session.adventure.name}` : 'the adventure'}
        </p>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[['Points', session.total_points], ['Time', formatTime(mins)]].map(([l, v]) => (
          <div key={l} style={{ minWidth: 0, background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: '600', wordBreak: 'break-word' }}>{v}</div>
            <div style={{ fontSize: '12px', color: T.faint, marginTop: '4px' }}>{l}</div>
          </div>
        ))}
      </div>

      {/* ── Story conclusion ── */}
      {session.adventure?.story_outro && (
        <div style={{ background: T.successBg, border: `1px solid ${T.successBorder}`,
          borderRadius: '10px', padding: '14px', marginBottom: '28px' }}>
          <p style={{ color: T.successText, fontSize: '13px', lineHeight: '1.65', margin: 0 }}>
            {session.adventure.story_outro}
          </p>
        </div>
      )}

      {/* ── Reward codes ── */}
      <p style={{ fontSize: '11px', fontWeight: '700', color: T.accent, letterSpacing: '.1em',
        textTransform: 'uppercase', margin: '0 0 4px' }}>
        Your rewards
      </p>
      <p style={{ color: T.muted, fontSize: '13px', margin: '0 0 16px' }}>
        Show your unique code at each business to claim your reward.
      </p>

      {rewards.length === 0 && (
        <p style={{ color: T.faint, fontSize: '13px' }}>Loading rewards...</p>
      )}

      {rewards.map(r => (
        <div key={r.code} style={{ background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: '10px', padding: '14px 16px', marginBottom: '10px' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', marginBottom: '10px' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 2px' }}>
                {r.partner?.name}
              </p>
              <p style={{ fontSize: '12px', color: T.muted, margin: 0 }}>
                {r.partner?.reward_description}
              </p>
            </div>
            {r.claimed_at && (
              <span style={{ fontSize: '10px', fontWeight: '700', color: T.success,
                background: T.successBg, padding: '3px 8px', borderRadius: '4px',
                whiteSpace: 'nowrap', marginLeft: '12px', letterSpacing: '.05em' }}>
                REDEEMED
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
            <div style={{ flex: 1, background: T.surfaceAlt, borderRadius: '8px',
              padding: '10px 14px', border: `1px solid ${T.border}` }}>
              <span style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: '700',
                letterSpacing: '.12em', color: T.accent }}>
                {r.code}
              </span>
            </div>
            <button onClick={() => copyCode(r.code)}
              style={{ background: copied === r.code ? T.success : T.surfaceAlt,
                border: `1px solid ${T.border}`, borderRadius: '8px',
                color: copied === r.code ? '#fff' : T.muted,
                padding: '10px 14px', fontSize: '12px', cursor: 'pointer',
                transition: 'all .15s', fontWeight: '500' }}>
              {copied === r.code ? '✓' : 'Copy'}
            </button>
          </div>
        </div>
      ))}

      <p style={{ color: T.faint, fontSize: '12px', textAlign: 'center', marginTop: '24px' }}>
        Certificate sent to {session.email}
      </p>
    </div>
  )
}