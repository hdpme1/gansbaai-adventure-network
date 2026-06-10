import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPartnerStats } from '../lib/api'

export default function PartnerPage() {
  const { slug } = useParams()
  const [pin, setPin]       = useState('')
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  async function handlePin() {
    if (pin.length < 4) return
    setLoading(true); setError('')
    const data = await getPartnerStats(slug, pin)
    if (data.error) {
      setError(data.error === 'Incorrect PIN' ? 'Incorrect PIN — try again.' : data.error)
      setLoading(false); return
    }
    setStats(data); setLoading(false)
  }

  if (!stats) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center',
      justifyContent:'center', padding:'24px' }}>
      <div style={{ width:'100%', maxWidth:'280px', textAlign:'center' }}>
        <div style={{ fontSize:'32px', marginBottom:'14px' }}>🔑</div>
        <h1 style={{ fontSize:'18px', fontWeight:'500', margin:'0 0 6px' }}>Partner Dashboard</h1>
        <p style={{ color:'#888', fontSize:'13px', margin:'0 0 24px' }}>
          Gansbaai Adventure Network
        </p>
        <input type="tel" value={pin} maxLength={4}
          onChange={e => setPin(e.target.value.replace(/\D/g,'').slice(0,4))}
          onKeyDown={e => e.key === 'Enter' && handlePin()}
          placeholder="PIN"
          style={{ width:'100%', background:'#111', border:'1px solid #2a2a2a',
            borderRadius:'8px', padding:'16px', color:'#fff', fontSize:'28px',
            textAlign:'center', letterSpacing:'10px', marginBottom:'12px',
            boxSizing:'border-box' }} />
        {error && <p style={{ color:'#f87171', fontSize:'13px', marginBottom:'10px' }}>{error}</p>}
        <button onClick={handlePin} disabled={pin.length < 4 || loading}
          style={{ width:'100%', background:'#fff', color:'#000', border:'none',
            padding:'13px', borderRadius:'8px', fontSize:'15px', fontWeight:'500',
            opacity: pin.length < 4 ? 0.4 : 1 }}>
          {loading ? 'Checking...' : 'View dashboard'}
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', padding:'28px 24px', maxWidth:'400px', margin:'0 auto' }}>
      <p style={{ fontSize:'12px', color:'#555', margin:'0 0 3px' }}>Partner dashboard</p>
      <h1 style={{ fontSize:'20px', fontWeight:'500', margin:'0 0 3px' }}>{stats.partner_name}</h1>
      <p style={{ fontSize:'13px', color:'#888', margin:'0 0 28px' }}>
        Checkpoint {stats.checkpoint_sequence}
      </p>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'10px', marginBottom:'24px' }}>
        {[
          ['Today',     stats.today, '#1D9E75'],
          ['This week', stats.week,  '#378ADD'],
          ['All time',  stats.total, '#C8953A'],
        ].map(([label, value, color]) => (
          <div key={label} style={{ background:'#111', border:'1px solid #1f1f1f',
            borderRadius:'10px', padding:'14px 10px', textAlign:'center' }}>
            <p style={{ fontSize:'28px', fontWeight:'500', margin:'0 0 4px', color }}>{value}</p>
            <p style={{ fontSize:'11px', color:'#666', margin:0 }}>{label}</p>
          </div>
        ))}
      </div>

      <div style={{ background:'#111', border:'1px solid #1f1f1f',
        borderRadius:'10px', padding:'16px', marginBottom:'16px' }}>
        <p style={{ fontSize:'11px', color:'#666', margin:'0 0 6px', textTransform:'uppercase',
          letterSpacing:'.05em' }}>Your reward offer</p>
        <p style={{ fontSize:'14px', margin:0, lineHeight:'1.55' }}>
          {stats.reward_description}
        </p>
      </div>

      <p style={{ color:'#444', fontSize:'11px', textAlign:'center', lineHeight:'1.6' }}>
        Numbers show players who successfully solved your checkpoint puzzle.
        Show your customers this screen if they ask about the adventure.
      </p>
    </div>
  )
}