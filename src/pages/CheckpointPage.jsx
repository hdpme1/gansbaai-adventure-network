import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSession, validateCheckpoint } from '../lib/api'
import GPSGate from '../components/GPSGate'

export default function CheckpointPage() {
  const { slug }    = useParams()
  const navigate    = useNavigate()
  const [session, setSession]   = useState(null)
  const [answer, setAnswer]     = useState('')
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [coords, setCoords]     = useState(null)

  useEffect(() => {
    const sid = localStorage.getItem('session_id')
    if (!sid) { navigate('/'); return }
    getSession(sid).then(data => {
      if (data.error) { navigate('/'); return }
      if (data.current_checkpoint?.slug !== slug) { navigate('/blocked'); return }
      setSession(data)
    })
  }, [slug])

  async function handleSubmit() {
    if (!answer.trim() || !coords) return
    setLoading(true); setResult(null)
    const sid  = localStorage.getItem('session_id')
    const data = await validateCheckpoint({
      session_id: sid, checkpoint_slug: slug,
      answer, player_lat: coords.lat, player_lng: coords.lng
    })
    setLoading(false)
    if (data.success && data.is_complete) { navigate('/complete'); return }
    if (data.success) {
      setResult({ ok: true, message: data.next_clue, next: data.next_checkpoint?.slug })
    } else {
      setResult({ ok: false, message: data.message })
    }
  }

  if (!session) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center',
      justifyContent:'center', color:'#555' }}>Loading...</div>
  )

  const cp = session.current_checkpoint

  return (
    <div style={{ minHeight:'100vh', padding:'24px', maxWidth:'480px', margin:'0 auto' }}>

      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'32px' }}>
        <span style={{ fontSize:'13px', color:'#555' }}>Checkpoint {cp.sequence}</span>
        <span style={{ fontSize:'13px', color:'#555' }}>{session.total_points} pts</span>
      </div>

      <p style={{ fontSize:'14px', color:'#aaa', lineHeight:'1.75', marginBottom:'28px',
        borderLeft:'2px solid #222', paddingLeft:'16px' }}>
        {cp.story_snippet}
      </p>

      <p style={{ fontSize:'16px', fontWeight:'500', lineHeight:'1.6', marginBottom:'24px' }}>
        {cp.riddle_text}
      </p>

      <GPSGate checkpoint={cp} onReady={setCoords} />

      {coords && (
        <>
          <input
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Your answer..."
            style={{ width:'100%', background:'#111', border:'1px solid #2a2a2a',
              borderRadius:'8px', padding:'14px', color:'#fff', fontSize:'15px',
              marginBottom:'10px' }}
          />
          <button onClick={handleSubmit} disabled={loading || !answer.trim()}
            style={{ width:'100%', background:'#fff', color:'#000', border:'none',
              padding:'14px', borderRadius:'8px', fontSize:'15px', fontWeight:'500',
              opacity: loading || !answer.trim() ? 0.5 : 1 }}>
            {loading ? 'Checking...' : 'Submit answer'}
          </button>
        </>
      )}

      {result && (
        <div style={{ marginTop:'20px', padding:'16px', borderRadius:'8px',
          background: result.ok ? '#052e16' : '#2d1212',
          border: '1px solid ' + (result.ok ? '#16a34a' : '#991b1b') }}>
          <p style={{ margin:'0 0 10px', color: result.ok ? '#86efac' : '#fca5a5',
            fontSize:'14px', lineHeight:'1.65' }}>
            {result.message}
          </p>
          {result.ok && result.next && (
            <button onClick={() => navigate('/c/' + result.next)}
              style={{ background:'#fff', color:'#000', border:'none',
                padding:'9px 20px', borderRadius:'6px', fontSize:'13px' }}>
              Next checkpoint →
            </button>
          )}
        </div>
      )}
    </div>
  )
}