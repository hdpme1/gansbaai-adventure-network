import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createSession } from '../lib/api'
import { saveSession } from '../lib/session'
import { L, NIGHT_INK, MAP_CREAM, ROUTE_BLUE, WEIGHT, btnPrimary, inputField } from '../lib/theme'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ player_name: '', email: '', phone: '' })
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [consentGiven, setConsentGiven] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const adventureSlug = new URLSearchParams(window.location.search).get('adventure') || 'lost-shark-logbook'

  async function handleSubmit() {
    if (!form.player_name || !form.email || !form.phone) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    setError('')

    const data = await createSession({ ...form, adventure_slug: adventureSlug })

    if (data.error) { setError(data.error); setLoading(false); return }

    saveSession(adventureSlug, data.session_id)

    if (data.status === 'COMPLETE') { navigate('/complete'); return }
    navigate('/c/' + data.current_checkpoint.slug)
  }

  const lbl = {
    display: 'block', fontSize: '11px', fontWeight: WEIGHT.semiBold, color: L.muted,
    letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '8px'
  }

  return (
    <div style={{ minHeight: '100vh', background: MAP_CREAM, color: NIGHT_INK,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '32px 24px' }}>

      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Back link */}
        <button onClick={() => navigate('/?adventure=' + adventureSlug)}
          style={{ background: 'none', border: 'none', color: L.muted, fontSize: '13px',
            fontWeight: WEIGHT.semiBold, cursor: 'pointer', padding: '0 0 28px',
            letterSpacing: '.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ← Back
        </button>

        <p style={{ fontSize: '11px', fontWeight: WEIGHT.semiBold, color: ROUTE_BLUE,
          letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
          PLAYCE
        </p>
        <h1 style={{ fontSize: '32px', fontWeight: WEIGHT.black, letterSpacing: '-.03em',
          textTransform: 'uppercase', marginBottom: '6px', lineHeight: 1.05 }}>
          JOIN THE CHASE.
        </h1>
        <p style={{ fontSize: '14px', color: L.muted, marginBottom: '36px', lineHeight: '1.55' }}>
          Drop in, pick up. Your progress is saved.
        </p>

        <label style={lbl}>Your Name</label>
        <input type="text" style={inputField({ marginBottom: '16px' })}
          value={form.player_name}
          onChange={e => set('player_name', e.target.value)} />

        <label style={lbl}>Email Address</label>
        <input type="email" style={inputField({ marginBottom: '16px' })}
          value={form.email}
          onChange={e => set('email', e.target.value)} />

        <label style={lbl}>Phone Number</label>
        <input type="tel" placeholder="083 123 4567"
          style={inputField({ marginBottom: '24px' })}
          value={form.phone}
          onChange={e => set('phone', e.target.value)} />

        {/* POPIA consent */}
        <div style={{ background: '#FFFFFF', border: `1.5px solid ${L.border}`,
          borderRadius: '12px', padding: '14px 16px', marginBottom: '20px' }}>
          <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={consentGiven}
              onChange={e => setConsentGiven(e.target.checked)}
              style={{ marginTop: '3px', flexShrink: 0, accentColor: ROUTE_BLUE,
                width: '16px', height: '16px' }} />
            <span style={{ fontSize: '12px', color: L.muted, lineHeight: '1.6' }}>
              By submitting your details you explicitly consent to the processing of your personal
              information in accordance with POPIA. We collect this data solely to manage your game
              session and track progress. Your data is stored securely, never shared with third parties
              for marketing, and you can request deletion at any time by contacting us.
            </span>
          </label>
        </div>

        {error && (
          <p style={{ color: L.coral, fontSize: '13px', marginBottom: '14px',
            fontWeight: WEIGHT.semiBold }}>{error}</p>
        )}

        <button onClick={handleSubmit} disabled={loading || !consentGiven}
          style={btnPrimary({ opacity: loading || !consentGiven ? 0.45 : 1 })}>
          {loading ? 'Starting...' : 'START THE CHASE.'}
        </button>
      </div>
    </div>
  )
}