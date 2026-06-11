import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession } from '../lib/api'

const THEME = {
  bg: '#0a0a0a',
  card: '#111',
  accent: '#C8953A',
  success: '#1D9E75',
  text: '#ffffff',
  textMuted: '#888',
  border: '#222'
}

const REWARDS = [
  { name: 'Gansbaai Coffee Company', reward: 'Free coffee with any purchase' },
  { name: 'Blue Goose Restaurant', reward: 'Free dessert with any main meal' },
  { name: 'Anchor and Ace', reward: '10% off your total bill' },
  { name: 'Gansbaai Bakhuis', reward: 'Free pastry with any hot drink' },
  { name: 'Coffee On The Rocks', reward: 'Free apple crumble with coffee' },
  { name: 'Danger Point Lighthouse', reward: 'Free entry for certificate holders' },
]

function formatTime(minutes) {
  if (minutes < 60) return minutes + ' min'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h + 'h' + (m > 0 ? ' ' + m + 'm' : '')
}

export default function CompletePage() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)

  useEffect(() => {
    const sid = localStorage.getItem('session_id')
    if (!sid) {
      navigate('/')
      return
    }
    getSession(sid).then(data => {
      if (data.status !== 'COMPLETE') {
        navigate('/')
        return
      }
      setSession(data)
    })
  }, [navigate])

  if (!session) return null

  const mins = Math.round((Date.now() - new Date(session.started_at)) / 60000)

  return (
    <div style={{ minHeight: '100vh', padding: '32px 24px', maxWidth: '480px', margin: '0 auto', background: THEME.bg, color: THEME.text }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ fontSize: '72px', marginBottom: '16px' }}>🏆</div>
        <h1 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '8px' }}>
          Adventure Complete!
        </h1>
        <p style={{ color: THEME.textMuted }}>You solved the Lost Shark Logbook</p>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
        {[['Points', session.total_points], ['Time', formatTime(mins)]].map(([label, value]) => (
          <div key={label} style={{
            flex: 1,
            background: THEME.card,
            border: `1px solid ${THEME.border}`,
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '28px', fontWeight: '600', color: THEME.success }}>{value}</div>
            <div style={{ fontSize: '13px', color: THEME.textMuted, marginTop: '4px' }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{
        background: '#052e16',
        border: '1px solid #166534',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '32px'
      }}>
        <p style={{ color: '#86efac', lineHeight: '1.7' }}>
          The Captain was never missing. He simply found something worth staying for.
          The sharks of Dyer Island became his family — and Gansbaai, his home.
          The logbook is complete.
        </p>
      </div>

      <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>Your Rewards</h2>
      <p style={{ color: THEME.textMuted, marginBottom: '20px' }}>
        Show this screen (or your email) at any of these partners:
      </p>

      {REWARDS.map(r => (
        <div key={r.name} style={{
          background: THEME.card,
          border: `1px solid ${THEME.border}`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '12px'
        }}>
          <p style={{ fontWeight: '500', marginBottom: '4px' }}>{r.name}</p>
          <p style={{ fontSize: '14px', color: THEME.textMuted }}>{r.reward}</p>
        </div>
      ))}

      <p style={{ textAlign: 'center', color: THEME.textMuted, marginTop: '32px', fontSize: '13px' }}>
        A digital certificate has been sent to <strong>{session.email}</strong>
      </p>
    </div>
  )
}