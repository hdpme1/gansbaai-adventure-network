import { useNavigate } from 'react-router-dom'

const THEME = {
  bg: '#0a0a0a',
  accent: '#C8953A',
  text: '#ffffff',
  textMuted: '#888'
}

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px',
      textAlign: 'center',
      background: THEME.bg,
      color: THEME.text
    }}>
      <div style={{ fontSize: '64px', marginBottom: '24px' }}>🦈</div>
      
      <h1 style={{
        fontSize: '32px',
        fontWeight: '600',
        marginBottom: '16px',
        letterSpacing: '-0.5px'
      }}>
        The Lost Shark Logbook
      </h1>

      <p style={{
        fontSize: '15px',
        color: THEME.textMuted,
        maxWidth: '380px',
        lineHeight: '1.7',
        marginBottom: '48px'
      }}>
        In 1987, marine researcher Captain van der Berg vanished from Gansbaai harbour.
        His logbook holds the truth. Seven pages are hidden across the town.
      </p>

      <button
        onClick={() => navigate('/register')}
        style={{
          background: '#fff',
          color: '#000',
          border: 'none',
          padding: '16px 40px',
          borderRadius: '12px',
          fontSize: '17px',
          fontWeight: '600',
          cursor: 'pointer'
        }}
      >
        Begin the Hunt
      </button>
    </div>
  )
}