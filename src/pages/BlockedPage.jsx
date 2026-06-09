import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession } from '../lib/api'

export default function BlockedPage() {
  const navigate = useNavigate()
  const [slug, setSlug] = useState(null)

  useEffect(() => {
    const sid = localStorage.getItem('session_id')
    if (!sid) { navigate('/'); return }
    getSession(sid).then(data => {
      if (data.current_checkpoint) setSlug(data.current_checkpoint.slug)
    })
  }, [])

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', padding:'24px', textAlign:'center' }}>
      <div style={{ fontSize:'40px', marginBottom:'16px' }}>🔒</div>
      <h1 style={{ fontSize:'20px', fontWeight:'500', marginBottom:'8px' }}>
        This stage is locked
      </h1>
      <p style={{ color:'#888', fontSize:'14px', maxWidth:'280px',
        lineHeight:'1.65', marginBottom:'28px' }}>
        You haven't unlocked this checkpoint yet. Follow the clues in order.
      </p>
      {slug && (
        <button onClick={() => navigate('/c/' + slug)}
          style={{ background:'#fff', color:'#000', border:'none',
            padding:'12px 24px', borderRadius:'8px', fontSize:'14px' }}>
          Go to my current checkpoint
        </button>
      )}
    </div>
  )
}