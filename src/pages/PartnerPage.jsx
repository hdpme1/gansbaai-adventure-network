import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPartnerStats, redeemCode } from '../lib/api'

// ─── Theme ─────────────────────────────────────────────────────────────────────
const T = {
  surface:       '#111111',
  border:        '#1f1f1f',
  borderMid:     '#2a2a2a',
  surfaceAlt:    '#1a1a1a',
  text:          '#ffffff',
  muted:         '#888888',
  faint:         '#444444',
  accent:        '#C8953A',
  success:       '#1D9E75',
  successBg:     '#052e16',
  successBorder: '#166534',
  successText:   '#86efac',
  errorBg:       '#2d1212',
  errorBorder:   '#991b1b',
  errorText:     '#fca5a5',
}

// Strip non-alphanumeric and rebuild GAN-XX-XXXX format as the user types
function formatCodeInput(raw) {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 9)
  let out = ''
  for (let i = 0; i < clean.length; i++) {
    if (i === 3 || i === 5) out += '-'   // GAN | CC | XXXX  (positions 3 and 5)
    out += clean[i]
  }
  return out
}

export default function PartnerPage() {
  const { slug } = useParams()

  // Auth
  const [pin, setPin]         = useState('')
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [storedPin, setStoredPin] = useState('')

  // Code redemption
  const [codeInput, setCodeInput]     = useState('')
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeResult, setCodeResult]   = useState(null)

  async function handlePin() {
    if (pin.length < 4) return
    setLoading(true); setAuthError('')
    const data = await getPartnerStats(slug, pin)
    if (data.error) {
      setAuthError(data.error === 'Incorrect PIN' ? 'Incorrect PIN — try again.' : data.error)
      setLoading(false); return
    }
    setStoredPin(pin)
    setStats(data)
    setLoading(false)
  }

  async function handleRefresh() {
    setLoading(true)
    const data = await getPartnerStats(slug, storedPin)
    if (!data.error) setStats(data)
    setLoading(false)
  }

  async function handleRedeem() {
    const trimmed = codeInput.replace(/\s/g, '')
    if (trimmed.length < 10) return
    setCodeLoading(true)
    setCodeResult(null)
    const data = await redeemCode(trimmed, slug, storedPin)
    setCodeLoading(false)
    if (data.success) {
      setCodeResult({ success: true, player_name: data.player_name, reward_description: data.reward_description })
      setCodeInput('')
    } else {
      setCodeResult({ success: false, message: data.message || data.error })
    }
  }

  // ── PIN entry ────────────────────────────────────────────────────────────────
  if (!stats) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '280px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '14px' }}>🔑</div>
        <h1 style={{ fontSize: '18px', fontWeight: '500', margin: '0 0 6px' }}>Partner Dashboard</h1>
        <p style={{ color: T.muted, fontSize: '13px', margin: '0 0 24px' }}>Gansbaai Adventure Network</p>
        <input
          type="tel"
          value={pin}
          maxLength={4}
          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onKeyDown={e => e.key === 'Enter' && handlePin()}
          placeholder="PIN"
          style={{ width: '100%', background: T.surface, border: `1px solid ${T.borderMid}`,
            borderRadius: '8px', padding: '16px', color: T.text, fontSize: '28px',
            textAlign: 'center', letterSpacing: '10px', marginBottom: '12px',
            boxSizing: 'border-box' }}
        />
        {authError && <p style={{ color: T.errorText, fontSize: '13px', marginBottom: '10px' }}>{authError}</p>}
        <button onClick={handlePin} disabled={pin.length < 4 || loading}
          style={{ width: '100%', background: T.text, color: '#000', border: 'none',
            padding: '13px', borderRadius: '8px', fontSize: '15px', fontWeight: '500',
            opacity: pin.length < 4 ? 0.4 : 1, cursor: 'pointer' }}>
          {loading ? 'Checking...' : 'View dashboard'}
        </button>
      </div>
    </div>
  )

  const multiAdventure = stats.adventures?.length > 1

  // ── Stats dashboard ──────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', padding: '28px 24px', maxWidth: '420px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <p style={{ fontSize: '12px', color: T.faint, margin: '0 0 3px' }}>Partner dashboard</p>
          <h1 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 2px' }}>{stats.partner_name}</h1>
          {!multiAdventure && stats.adventures?.[0] && (
            <p style={{ fontSize: '13px', color: T.muted, margin: 0 }}>
              {stats.adventures[0].name}
            </p>
          )}
        </div>
        <button onClick={handleRefresh}
          style={{ background: 'none', border: `1px solid ${T.border}`, color: T.muted,
            padding: '7px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
          {loading ? '...' : '↻'}
        </button>
      </div>

      {/* Stats tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px', marginBottom: '24px' }}>
        {[
          ['Today',     stats.today, '#1D9E75'],
          ['This week', stats.week,  '#378ADD'],
          ['All time',  stats.total, '#C8953A'],
        ].map(([label, value, color]) => (
          <div key={label} style={{ background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: '10px', padding: '14px 10px', textAlign: 'center' }}>
            <p style={{ fontSize: '28px', fontWeight: '600', margin: '0 0 4px', color }}>{value}</p>
            <p style={{ fontSize: '11px', color: T.faint, margin: 0 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Reward offer(s) — supports multi-adventure */}
      {multiAdventure ? (
        stats.adventures.map((adv) => (
          <div key={adv.slug} style={{ background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: '10px', padding: '14px 16px', marginBottom: '10px' }}>
            <p style={{ fontSize: '10px', fontWeight: '700', color: T.accent,
              letterSpacing: '.08em', textTransform: 'uppercase', margin: '0 0 4px' }}>
              {adv.name}
            </p>
            <p style={{ fontSize: '14px', margin: 0, lineHeight: '1.55' }}>{adv.reward_description}</p>
          </div>
        ))
      ) : (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: '10px', padding: '14px 16px', marginBottom: '24px' }}>
          <p style={{ fontSize: '11px', color: T.faint, margin: '0 0 6px',
            textTransform: 'uppercase', letterSpacing: '.05em' }}>Your reward offer</p>
          <p style={{ fontSize: '14px', margin: 0, lineHeight: '1.55' }}>
            {stats.reward_description}
          </p>
        </div>
      )}

      {/* Recent redemptions */}
      {stats.recent?.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '11px', color: T.faint, textTransform: 'uppercase',
            letterSpacing: '.05em', margin: '0 0 10px' }}>Recent redemptions</p>
          {stats.recent.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', padding: '10px 0',
              borderBottom: i < stats.recent.length - 1 ? `1px solid ${T.border}` : 'none' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 2px' }}>
                  {r.player_name}
                </p>
                {multiAdventure && r.adventure_name && (
                  <p style={{ fontSize: '11px', color: T.muted, margin: 0 }}>{r.adventure_name}</p>
                )}
              </div>
              <p style={{ fontSize: '11px', color: T.faint, margin: 0 }}>
                {new Date(r.claimed_at).toLocaleString('en-ZA', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Code verification ── */}
      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: '24px' }}>
        <p style={{ fontSize: '11px', fontWeight: '700', color: T.accent,
          letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>
          Verify a code
        </p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            value={codeInput}
            onChange={e => setCodeInput(formatCodeInput(e.target.value))}
            onKeyDown={e => e.key === 'Enter' && handleRedeem()}
            placeholder="GAN-XX-XXXX"
            style={{ flex: 1, background: T.surface, border: `1px solid ${T.borderMid}`,
              borderRadius: '8px', padding: '13px 14px', color: T.text,
              fontSize: '16px', fontFamily: 'monospace', letterSpacing: '.08em',
              boxSizing: 'border-box' }}
          />
          <button onClick={handleRedeem}
            disabled={codeInput.replace(/-/g, '').length < 9 || codeLoading}
            style={{ background: T.accent, border: 'none', borderRadius: '8px',
              color: '#000', padding: '13px 18px', fontSize: '14px', fontWeight: '600',
              cursor: codeInput.replace(/-/g, '').length < 9 ? 'default' : 'pointer',
              opacity: codeInput.replace(/-/g, '').length < 9 ? 0.4 : 1 }}>
            {codeLoading ? '...' : 'Verify'}
          </button>
        </div>

        {codeResult?.success && (
          <div style={{ background: T.successBg, border: `1px solid ${T.successBorder}`,
            borderRadius: '10px', padding: '14px 16px' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: T.success,
              letterSpacing: '.08em', textTransform: 'uppercase', margin: '0 0 6px' }}>
              ✓ Valid — give the reward
            </p>
            <p style={{ fontSize: '15px', fontWeight: '600', color: T.text, margin: '0 0 2px' }}>
              {codeResult.player_name}
            </p>
            <p style={{ fontSize: '13px', color: T.successText, margin: 0 }}>
              {codeResult.reward_description}
            </p>
          </div>
        )}

        {codeResult && !codeResult.success && (
          <div style={{ background: T.errorBg, border: `1px solid ${T.errorBorder}`,
            borderRadius: '10px', padding: '14px 16px' }}>
            <p style={{ fontSize: '13px', color: T.errorText, margin: 0, lineHeight: '1.55' }}>
              {codeResult.message}
            </p>
          </div>
        )}

        <p style={{ color: T.faint, fontSize: '11px', marginTop: '12px', lineHeight: '1.5' }}>
          Each code is single-use. Once verified it cannot be redeemed again.
        </p>
      </div>
    </div>
  )
}