import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createSession } from '../lib/api'

const inp = { width:'100%', background:'#111', border:'1px solid #2a2a2a',
  borderRadius:'8px', padding:'12px 14px', color:'#fff', fontSize:'15px' }

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm]     = useState({ player_name:'', email:'', phone:'' })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit() {
    if (!form.player_name || !form.email || !form.phone) {
      setError('Please fill in all fields'); return
    }
    setLoading(true); setError('')
    const data = await createSession({ ...form, adventure_slug: 'lost-shark-logbook' })
    if (data.error) { setError(data.error); setLoading(false); return }
    localStorage.setItem('session_id', data.session_id)
    navigate('/c/' + data.current_checkpoint.slug)
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center',
      justifyContent:'center', padding:'24px' }}>
      <div style={{ width:'100%', maxWidth:'380px' }}>
        <h1 style={{ fontSize:'22px', fontWeight:'500', marginBottom:'6px' }}>Join the hunt</h1>
        <p style={{ color:'#888', fontSize:'13px', marginBottom:'28px' }}>
          Your progress is saved — come back anytime with the same phone number.
        </p>

        <label style={{ display:'block', fontSize:'12px', color:'#888', marginBottom:'6px' }}>Name</label>
        <input style={{ ...inp, marginBottom:'14px' }} type="text"
          value={form.player_name} onChange={e => set('player_name', e.target.value)} />

        <label style={{ display:'block', fontSize:'12px', color:'#888', marginBottom:'6px' }}>Email</label>
        <input style={{ ...inp, marginBottom:'14px' }} type="email"
          value={form.email} onChange={e => set('email', e.target.value)} />

        <label style={{ display:'block', fontSize:'12px', color:'#888', marginBottom:'6px' }}>
          Phone number
        </label>
        <input style={{ ...inp, marginBottom:'20px' }} type="tel" placeholder="083 123 4567"
          value={form.phone} onChange={e => set('phone', e.target.value)} />

        {error && <p style={{ color:'#f87171', fontSize:'13px', marginBottom:'12px' }}>{error}</p>}

        <button onClick={handleSubmit} disabled={loading}
          style={{ width:'100%', background:'#fff', color:'#000', border:'none',
            padding:'14px', borderRadius:'8px', fontSize:'15px', fontWeight:'500',
            opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Starting adventure...' : 'Start the adventure'}
        </button>
      </div>
    </div>
  )
}