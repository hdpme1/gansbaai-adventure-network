import { useNavigate } from 'react-router-dom'

const S = {
  wrap: { minHeight:'100vh', display:'flex', flexDirection:'column',
    alignItems:'center', justifyContent:'center', padding:'32px', textAlign:'center' },
  icon: { fontSize:'52px', marginBottom:'20px' },
  h1:   { fontSize:'30px', fontWeight:'600', marginBottom:'10px', letterSpacing:'-0.5px' },
  sub:  { fontSize:'15px', color:'#888', maxWidth:'380px', lineHeight:'1.7', marginBottom:'40px' },
  btn:  { background:'#fff', color:'#000', border:'none', padding:'14px 36px',
    borderRadius:'8px', fontSize:'16px', fontWeight:'500', cursor:'pointer' }
}

export default function LandingPage() {
  const navigate = useNavigate()
  return (
    <div style={S.wrap}>
      <div style={S.icon}>🦈</div>
      <h1 style={S.h1}>The Lost Shark Logbook</h1>
      <p style={S.sub}>
        In 1987, marine researcher Captain van der Berg vanished from Gansbaai harbour.
        His logbook holds the truth. Seven pages are hidden across the town.
      </p>
      <button style={S.btn} onClick={() => navigate('/register')}>
        Begin the hunt
      </button>
    </div>
  )
}