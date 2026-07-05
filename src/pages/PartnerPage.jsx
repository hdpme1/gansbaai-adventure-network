import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPartnerStats, redeemCode } from '../lib/api'
import { D, NIGHT_INK, ROUTE_BLUE, UNLOCK_LIME, SIGNAL_CORAL, WEIGHT } from '../lib/theme'

function formatCodeInput(raw) {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 9)
  let out = ''
  for (let i = 0; i < clean.length; i++) {
    if (i === 3 || i === 5) out += '-'
    out += clean[i]
  }
  return out
}

export default function PartnerPage() {
  const { slug } = useParams()

  const [pin,       setPin]       = useState('')
  const [stats,     setStats]     = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [authError, setAuthError] = useState('')
  const [storedPin, setStoredPin] = useState('')
  const [selectedAdventureSlug, setSelectedAdventureSlug] = useState(null)

  const [codeInput,  setCodeInput]  = useState('')
  const [codeLoading,setCodeLoading]= useState(false)
  const [codeResult, setCodeResult] = useState(null)

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
    setSelectedAdventureSlug(data.adventures?.[0]?.slug || null)
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
    setCodeLoading(true); setCodeResult(null)
    const data = await redeemCode(trimmed, slug, storedPin)
    setCodeLoading(false)
    if (data.success) {
      setCodeResult({ success: true, player_name: data.player_name, reward_description: data.reward_description })
      setCodeInput('')
    } else {
      setCodeResult({ success: false, message: data.message || data.error })
    }
  }

  if (!stats) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px', background: NIGHT_INK, color: '#fff' }}>
      <div style={{ width: '100%', maxWidth: '280px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '14px' }}>⚡</div>
        <h1 style={{ fontSize: '18px', fontWeight: WEIGHT.black, textTransform: 'uppercase',
          margin: '0 0 6px' }}>Partner Dashboard</h1>
        <p style={{ color: D.muted, fontSize: '13px', margin: '0 0 24px' }}>PLAYCE</p>
        <input type="tel" value={pin} maxLength={4}
          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onKeyDown={e => e.key === 'Enter' && handlePin()}
          placeholder="PIN"
          style={{ width: '100%', background: D.surface, border: `1px solid ${D.border}`,
            borderRadius: '8px', padding: '16px', color: '#fff', fontSize: '28px',
            textAlign: 'center', letterSpacing: '10px', marginBottom: '12px',
            boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
        {authError && <p style={{ color: SIGNAL_CORAL, fontSize: '13px', marginBottom: '10px' }}>{authError}</p>}
        <button onClick={handlePin} disabled={pin.length < 4 || loading}
          style={{ width: '100%', background: ROUTE_BLUE, color: '#fff', border: 'none',
            padding: '13px', borderRadius: '100px', fontSize: '14px',
            fontWeight: WEIGHT.semiBold, letterSpacing: '.06em', textTransform: 'uppercase',
            opacity: pin.length < 4 ? 0.4 : 1, cursor: 'pointer' }}>
          {loading ? 'Checking...' : 'View Dashboard'}
        </button>
      </div>
    </div>
  )

  const multiAdventure = stats.adventures?.length > 1
  const activeAdv = multiAdventure
    ? stats.adventures.find(a => a.slug === selectedAdventureSlug) || stats.adventures[0]
    : stats.adventures?.[0]

  return (
    <div style={{ minHeight: '100vh', padding: '28px 24px', maxWidth: '420px',
      margin: '0 auto', background: NIGHT_INK, color: '#fff' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: WEIGHT.semiBold, color: D.faint,
            letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 3px' }}>
            Partner Dashboard
          </p>
          <h1 style={{ fontSize: '20px', fontWeight: WEIGHT.black,
            textTransform: 'uppercase', margin: '0 0 6px' }}>{stats.partner_name}</h1>
          {multiAdventure ? (
            <select value={selectedAdventureSlug || ''}
              onChange={e => setSelectedAdventureSlug(e.target.value || null)}
              style={{ background: D.surface, color: '#fff',
                border: `1px solid ${D.border}`, borderRadius: '6px',
                padding: '6px 10px', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>
              {stats.adventures.map(adv => (
                <option key={adv.slug} value={adv.slug}>{adv.name}</option>
              ))}
            </select>
          ) : (
            stats.adventures?.[0] && (
              <p style={{ fontSize: '13px', color: D.muted, margin: 0 }}>
                {stats.adventures[0].name}
              </p>
            )
          )}
        </div>
        <button onClick={handleRefresh}
          style={{ background: 'none', border: `1px solid ${D.border}`,
            color: D.muted, padding: '7px 14px', borderRadius: '100px',
            fontSize: '12px', cursor: 'pointer' }}>
          {loading ? '...' : '↻'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px', marginBottom: '24px' }}>
        {[['Today', stats.today, '#1D9E75'], ['This week', stats.week, ROUTE_BLUE],
          ['All time', stats.total, UNLOCK_LIME]].map(([label, value, color]) => (
          <div key={label} style={{ background: D.surface, border: `1px solid ${D.border}`,
            borderRadius: '10px', padding: '14px 10px', textAlign: 'center' }}>
            <p style={{ fontSize: '28px', fontWeight: WEIGHT.black,
              margin: '0 0 4px', color }}>{value}</p>
            <p style={{ fontSize: '11px', color: D.faint, margin: 0 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Reward offer */}
      {activeAdv && (
        <div style={{ background: D.surface, border: `1px solid ${D.border}`,
          borderRadius: '10px', padding: '14px 16px', marginBottom: '24px' }}>
          <p style={{ fontSize: '11px', fontWeight: WEIGHT.semiBold, color: D.faint,
            margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Your Reward Offer
          </p>
          <p style={{ fontSize: '14px', margin: 0, lineHeight: '1.55', color: '#e0e0e0' }}>
            {activeAdv.reward_description}
          </p>
        </div>
      )}

      {/* Recent redemptions */}
      {stats.recent?.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '11px', fontWeight: WEIGHT.semiBold, color: D.faint,
            textTransform: 'uppercase', letterSpacing: '.05em', margin: '0 0 10px' }}>
            Recent Redemptions
          </p>
          {stats.recent.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', padding: '10px 0',
              borderBottom: i < stats.recent.length - 1 ? `1px solid ${D.border}` : 'none' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: WEIGHT.semiBold,
                  margin: '0 0 2px' }}>{r.player_name}</p>
                {multiAdventure && r.adventure_name && (
                  <p style={{ fontSize: '11px', color: D.muted, margin: 0 }}>
                    {r.adventure_name}
                  </p>
                )}
              </div>
              <p style={{ fontSize: '11px', color: D.faint, margin: 0 }}>
                {new Date(r.claimed_at).toLocaleString('en-ZA', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Code verification */}
      <div style={{ borderTop: `1px solid ${D.border}`, paddingTop: '24px' }}>
        <p style={{ fontSize: '11px', fontWeight: WEIGHT.semiBold, color: ROUTE_BLUE,
          letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>
          Verify a Code
        </p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input value={codeInput} onChange={e => setCodeInput(formatCodeInput(e.target.value))}
            onKeyDown={e => e.key === 'Enter' && handleRedeem()}
            placeholder="GAN-XX-XXXX"
            style={{ flex: 1, background: D.surface, border: `1px solid ${D.border}`,
              borderRadius: '8px', padding: '13px 14px', color: '#fff',
              fontSize: '16px', fontFamily: 'monospace', letterSpacing: '.08em',
              boxSizing: 'border-box', outline: 'none' }} />
          <button onClick={handleRedeem}
            disabled={codeInput.replace(/-/g, '').length < 9 || codeLoading}
            style={{ background: ROUTE_BLUE, border: 'none', borderRadius: '100px',
              color: '#fff', padding: '13px 18px', fontSize: '13px',
              fontWeight: WEIGHT.semiBold, letterSpacing: '.04em', textTransform: 'uppercase',
              cursor: codeInput.replace(/-/g, '').length < 9 ? 'default' : 'pointer',
              opacity: codeInput.replace(/-/g, '').length < 9 ? 0.4 : 1 }}>
            {codeLoading ? '...' : 'Verify'}
          </button>
        </div>

        {codeResult?.success && (
          <div style={{ background: '#0F1F0A', border: `1px solid #2A5C1A`,
            borderRadius: '10px', padding: '14px 16px' }}>
            <p style={{ fontSize: '11px', fontWeight: WEIGHT.semiBold, color: UNLOCK_LIME,
              letterSpacing: '.08em', textTransform: 'uppercase', margin: '0 0 6px' }}>
              ✓ Valid — give the reward
            </p>
            <p style={{ fontSize: '15px', fontWeight: WEIGHT.semiBold,
              color: '#fff', margin: '0 0 2px' }}>{codeResult.player_name}</p>
            <p style={{ fontSize: '13px', color: UNLOCK_LIME, margin: 0 }}>
              {codeResult.reward_description}
            </p>
          </div>
        )}

        {codeResult && !codeResult.success && (
          <div style={{ background: '#2D1215', border: `1px solid #5C2028`,
            borderRadius: '10px', padding: '14px 16px' }}>
            <p style={{ fontSize: '13px', color: SIGNAL_CORAL, margin: 0, lineHeight: '1.55' }}>
              {codeResult.message}
            </p>
          </div>
        )}

        <p style={{ color: D.faint, fontSize: '11px', marginTop: '12px', lineHeight: '1.5' }}>
          Each code is single-use. Once verified it cannot be redeemed again.
        </p>
      </div>
    </div>
  )
}