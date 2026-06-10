import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession } from '../lib/api'

const REWARDS = [
  { name: 'Gansbaai Coffee Company',  reward: 'Free coffee with any purchase' },
  { name: 'Blue Goose Restaurant',    reward: 'Free dessert with any main meal' },
  { name: 'Anchor and Ace',           reward: '10% off your total bill' },
  { name: 'Gansbaai Bakhuis',         reward: 'Free pastry with any hot drink' },
  { name: 'Coffee On The Rocks',      reward: 'Free apple crumble with coffee' },
  { name: 'Danger Point Lighthouse',  reward: 'Free entry for certificate holders' },
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
    if (!sid) { navigate('/'); return }
    getSession(sid).then(data => {
      if (data.status !== 'COMPLETE') { navigate('/'); return }
      setSession(data)
    })
  }, [])

  if (!session) return null

  const mins = Math.round((Date.now() - new Date(session.started_at)) / 60000)

  return (
    <div style={{ minHeight:'100vh', padding:'32px 24px',
      maxWidth:'480px', margin:'0 auto' }}>

      <div style={{ textAlign:'center', marginBottom:'32px' }}>
        <div style={{ fontSize:'52px', marginBottom:'16px' }}>&#129416;</div>
        <h1 style={{ fontSize:'24px', fontWeight:'500', margin:'0 0 6px' }}>
          Adventure complete!
        </h1>
        <p style={{ color:'#888', fontSize:'14px', margin:0 }}>
          You solved the Lost Shark Logbook
        </p>
      </div>

      <div style={{ display:'flex', gap:'14px', marginBottom:'24px' }}>
        {[['Points', session.total_points], ['Time', formatTime(mins)]].map(([l, v]) => (
          <div key={l} style={{ flex:1, background:'#111', border:'1px solid #222',
            borderRadius:'10px', padding:'16px', textAlign:'center' }}>
            <div style={{ fontSize:'24px', fontWeight:'500' }}>{v}</div>
            <div style={{ fontSize:'12px', color:'#666', marginTop:'4px' }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ background:'#052e16', border:'1px solid #166534',
        borderRadius:'10px', padding:'14px', marginBottom:'24px' }}>
        <p style={{ color:'#86efac', fontSize:'13px', lineHeight:'1.65', margin:0 }}>
          The Captain was never missing. He simply found something worth staying for.
          The sharks of Dyer Island became his family — and Gansbaai, his home.
          The logbook is complete.
        </p>
      </div>

      <h2 style={{ fontSize:'15px', fontWeight:'500', margin:'0 0 6px' }}>
        Your rewards
      </h2>
      <p style={{ color:'#888', fontSize:'13px', margin:'0 0 14px' }}>
        Show this screen at any of these businesses:
      </p>

      {REWARDS.map(r => (
        <div key={r.name} style={{ background:'#111', border:'1px solid #222',
          borderRadius:'8px', padding:'12px 14px', marginBottom:'8px' }}>
          <p style={{ fontSize:'13px', fontWeight:'500', margin:'0 0 3px' }}>{r.name}</p>
          <p style={{ fontSize:'12px', color:'#888', margin:0 }}>{r.reward}</p>
        </div>
      ))}

      <p style={{ color:'#555', fontSize:'12px', textAlign:'center',
        marginTop:'24px' }}>
        Check your email — your certificate and rewards have been sent to {session.email}
      </p>
    </div>
  )
}