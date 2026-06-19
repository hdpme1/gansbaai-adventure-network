import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createSession } from '../lib/api'

const THEME = {
  bg: '#0a0a0a',
  card: '#111',
  accent: '#C8953A',
  text: '#ffffff',
  textMuted: '#888',
  border: '#222'
}

const inputStyle = {
  width: '100%',
  background: THEME.card,
  border: `1px solid ${THEME.border}`,
  borderRadius: '12px',
  padding: '16px',
  color: THEME.text,
  fontSize: '16px',
  marginBottom: '16px'
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ player_name: '', email: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(k, v) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit() {
    if (!form.player_name || !form.email || !form.phone) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    setError('')

    const adventureSlug = new URLSearchParams(window.location.search).get('adventure') || 'lost-shark-logbook'
    const data = await createSession({ ...form, adventure_slug: adventureSlug })

    if (data.error) {
      setError(data.error)
      setLoading(false)
      return
    }

    localStorage.setItem('session_id', data.session_id)
    if (data.status === 'COMPLETE') {
      navigate('/complete')
      return
    }
    navigate('/c/' + data.current_checkpoint.slug)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: THEME.bg,
      color: THEME.text
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <h1 className="font-serif" style={{ fontSize: '28px', fontWeight: '600', marginBottom: '8px' }}>
          Join the Hunt
        </h1>
        <p style={{ color: THEME.textMuted, marginBottom: '32px' }}>
          Your progress is saved — return anytime with the same phone number.
        </p>

        <label style={{ display: 'block', fontSize: '13px', color: THEME.textMuted, marginBottom: '6px' }}>
          Your Name
        </label>
        <input
          type="text"
          style={inputStyle}
          value={form.player_name}
          onChange={e => set('player_name', e.target.value)}
        />

        <label style={{ display: 'block', fontSize: '13px', color: THEME.textMuted, marginBottom: '6px' }}>
          Email Address
        </label>
        <input
          type="email"
          style={inputStyle}
          value={form.email}
          onChange={e => set('email', e.target.value)}
        />

        <label style={{ display: 'block', fontSize: '13px', color: THEME.textMuted, marginBottom: '6px' }}>
          Phone Number
        </label>
        <input
          type="tel"
          placeholder="083 123 4567"
          style={inputStyle}
          value={form.phone}
          onChange={e => set('phone', e.target.value)}
        />

        {error && <p style={{ color: '#f87171', marginBottom: '16px' }}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px',
            background: THEME.accent,
            color: '#000',
            border: 'none',
            borderRadius: '12px',
            fontSize: '17px',
            fontWeight: '600',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Starting Adventure...' : 'Start the Adventure'}
        </button>
      </div>
    </div>
  )
}