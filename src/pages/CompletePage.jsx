import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession } from '../lib/api'

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
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', padding:'32px', textAlign:'center' }}>
      <div style={{ fontSize:'52px', marginBottom:'16px' }}>🏆</div>
      <h1 style={{ fontSize:'26px', fontWeight:'500', marginBottom:'8px' }}>
        Adventure complete!
      </h1>
      <p style={{ color:'#888', fontSize:'14px', marginBottom:'36px' }}>
        You solved the mystery of the Lost Shark Logbook
      </p>

      <div style={{ display:'flex', gap:'16px', marginBottom:'36px' }}>
        {[['Points', session.total_points], ['Time', mins + 'm']].map(([l, v]) => (
          <div key={l} style={{ background:'#111', border:'1px solid #222',
            borderRadius:'10px', padding:'18px 28px', textAlign:'center' }}>
            <div style={{ fontSize:'26px', fontWeight:'500' }}>{v}</div>
            <div style={{ fontSize:'12px', color:'#666', marginTop:'4px' }}>{l}</div>
          </div>
        ))}
      </div>

      <p style={{ color:'#888', fontSize:'13px', lineHeight:'1.7', maxWidth:'320px' }}>
        Your vouchers and completion certificate have been sent to {session.email}
      </p>
    </div>
  )
}