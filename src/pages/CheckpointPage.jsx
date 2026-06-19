import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import GPSGate from '../components/GPSGate'
import AudioCluePlayer from '../components/AudioCluePlayer'
import { getSession, validateCheckpoint, sendCompletion, getHint } from '../lib/api'
import AnimatedNumber from '../components/AnimatedNumber'

if (typeof document !== 'undefined' && !document.getElementById('artifact-pop-keyframes')) {
  const style = document.createElement('style')
  style.id = 'artifact-pop-keyframes'
  style.textContent = `
    @keyframes artifactPop {
      0% { opacity: 0; transform: translateY(24px) scale(0.95); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
  `
  document.head.appendChild(style)
}

const T = {
  bg:          '#0a0a0a',
  surface:     '#111111',
  surfaceAlt:  '#1a1a1a',
  border:      '#1f1f1f',
  borderMid:   '#2a2a2a',
  text:        '#ffffff',
  muted:       '#888888',
  faint:       '#333333',
  accent:      '#C8953A',
  accentDim:   '#7a5a22',
  success:     '#1D9E75',
  successBg:   '#062419',
  successBorder:'#10593e',
  successText: '#86efac',
  errorBg:     '#2d1010',
  errorBorder: '#7f1d1d',
  errorText:   '#fca5a5'
}

const inputStyle = {
  width: '100%', padding: '16px', background: T.surface, border: `1px solid ${T.border}`,
  borderRadius: '12px', color: T.text, fontSize: '16px', outline: 'none',
  transition: 'border-color 0.2s', marginBottom: '16px', WebkitAppearance: 'none'
}

const btn = (custom) => ({
  width: '100%', padding: '16px', borderRadius: '12px', fontSize: '15px',
  fontWeight: '600', cursor: 'pointer', border: 'none', display: 'flex',
  alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease', ...custom
})

export default function CheckpointPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [session, setSession]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [view, setView]         = useState('story') // 'story' | 'puzzle' | 'success' | 'completing'
  const [answer, setAnswer]     = useState('')
  const [coords, setCoords]     = useState(null)
  const [error, setError]       = useState('')
  const [checking, setChecking] = useState(false)
  const [result, setResult]     = useState({ next: null, message: '', points_earned: 0 })
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState(false)

  // Hint tracking states
  const [hintActive, setHintActive] = useState(null) // null | 1 | 2
  const [hintText, setHintText]     = useState('')
  const [hintLoading, setHintLoading] = useState(false)
  const [confirmHintId, setConfirmHintId] = useState(null) // null | 1 | 2

  const bgAudioRef = useRef(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setAnswer('')
    setCoords(null)
    setHintActive(null)
    setHintText('')
    setConfirmHintId(null)

    const sid = localStorage.getItem('session_id')
    if (!sid) { navigate('/'); return }

    getSession(sid).then(data => {
      if (!active) return
      if (data.error) { navigate('/'); return }

      setSession(data)
      
      const currentCp = data.adventure?.checkpoints?.find(c => c.id === id)
      if (!currentCp) {
        navigate('/')
        return
      }

      // Sync views
      const isDone = data.completed_checkpoints?.some(cc => cc.checkpoint_id === id)
      if (isDone) {
        const matchingDone = data.completed_checkpoints.find(cc => cc.checkpoint_id === id)
        setResult({
          next: matchingDone.next_checkpoint_id,
          message: currentCp.next_clue || '',
          points_earned: matchingDone.points_awarded || 0
        })
        setView('success')
      } else {
        setView('story')
      }
      setLoading(false)
    })

    return () => { active = false }
  }, [id, navigate])

  useEffect(() => {
    return () => {
      if (bgAudioRef.current) {
        bgAudioRef.current.pause()
      }
    }
  }, [])

  if (loading || !session) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, background: T.bg }}>
      Loading entry details...
    </div>
  )

  const cp = session.adventure?.checkpoints?.find(c => c.id === id)
  if (!cp) return null

  const artifact = cp.artifact

  // Setup background audio dynamically if present
  if (!bgAudioRef.current && cp.audio_url) {
    bgAudioRef.current = new Audio(cp.audio_url)
    bgAudioRef.current.loop = true
    bgAudioRef.current.volume = 0.2
  }

  function handleStartPuzzle() {
    if (navigator.vibrate) navigator.vibrate(40)
    if (bgAudioRef.current) {
      bgAudioRef.current.play().catch(e => console.log("Music blocked", e))
    }
    setView('puzzle')
  }

  async function handleVerifyAnswer(e) {
    e.preventDefault()
    if (!answer.trim() || checking) return
    setChecking(true)
    setError('')

    try {
      const res = await validateCheckpoint(session.id, cp.id, answer.trim(), coords)
      if (res.error) {
        setError(res.error)
        if (navigator.vibrate) navigator.vibrate([60, 40, 60]) // double buzz for error
        setChecking(false)
        return
      }

      if (navigator.vibrate) navigator.vibrate(120) // Long solid success vibration

      setResult({
        next: res.next_checkpoint_id,
        message: res.next_clue_text || cp.next_clue || '',
        points_earned: res.points_awarded || 0
      })

      // Sync state score immediately
      setSession(prev => ({
        ...prev,
        total_points: (prev.total_points || 0) + (res.points_awarded || 0)
      }))

      setView('success')
    } catch (err) {
      setError('Network verification failure. Try submitting your answer again.')
    } finally {
      setChecking(false)
    }
  }

  async function handleRequestHint(hintNumber) {
    if (hintLoading) return
    setHintLoading(true)
    try {
      const data = await getHint(session.id, cp.id, hintNumber)
      if (data.error) {
        setError(data.error)
      } else {
        setHintText(data.hint_text)
        setHintActive(hintNumber)
        setConfirmHintId(null)
        if (data.running_total_points !== undefined) {
          setSession(prev => ({ ...prev, total_points: data.running_total_points }))
        }
      }
    } catch (e) {
      setError('Could not retrieve hint data.')
    } finally {
      setHintLoading(false)
    }
  }

  async function handleFinalizeAdventure() {
    setView('completing')
    try {
      await sendCompletion(session.id)
      if (navigator.vibrate) navigator.vibrate([40, 40, 40])
      // Route direct to summary page
      navigate('/complete')
    } catch (err) {
      // Fallback redirection even on network drop
      navigate('/complete')
    }
  }

  async function downloadArtifact(url, name) {
    setDownloading(true)
    setDownloadError(false)
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `${name.toLowerCase().replace(/\s+/g, '-')}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
    } catch (e) {
      setDownloadError(true)
    } finally {
      setDownloading(false)
    }
  }

  // ── Story view ──
  if (view === 'story') return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, padding: '32px 24px', maxWidth: '480px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', borderBottom: `1px solid ${T.border}`, paddingBottom: '16px' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: '600', color: T.accent, letterSpacing: '.1em', textTransform: 'uppercase' }}>Logbook Entry</span>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '4px 0 0' }}>{cp.slug.replace(/-/g, ' ')}</h2>
        </div>
        <div style={{ background: T.surface, padding: '8px 14px', borderRadius: '8px', border: `1px solid ${T.border}`, textAlign: 'right' }}>
          <span style={{ display: 'block', fontSize: '9px', color: T.muted, textTransform: 'uppercase', fontWeight: '600' }}>Score</span>
          <span style={{ fontSize: '16px', fontWeight: '700', color: T.accent }}><AnimatedNumber value={session.total_points || 0} /></span>
        </div>
      </div>

      <div className="font-serif" style={{ fontSize: '17px', lineHeight: '1.75', color: '#e0e0e0', background: T.surface, padding: '24px', borderRadius: '14px', border: `1px solid ${T.border}`, marginBottom: '32px', fontStyle: 'italic', position: 'relative' }}>
        "{cp.story_snippet}"
      </div>

      <button onClick={handleStartPuzzle} style={btn({ background: T.text, color: T.bg })}>
        Continue to Riddle →
      </button>
    </div>
  )

  // ── Puzzle view ──
  if (view === 'puzzle') return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, padding: '32px 24px', maxWidth: '480px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* Sticky Running Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <span style={{ fontSize: '11px', color: T.accent, fontWeight: '600', letterSpacing: '.05em', textTransform: 'uppercase' }}>Active Objective</span>
          <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Location Lock</h2>
        </div>
        <div style={{ background: T.surface, padding: '6px 12px', borderRadius: '8px', border: `1px solid ${T.border}` }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: T.accent }}><AnimatedNumber value={session.total_points || 0} /> <span style={{ fontSize: '10px', color: T.muted }}>PTS</span></span>
        </div>
      </div>

      <GPSGate checkpoint={cp} onReady={setCoords} autoRequest={true} />

      {coords && (
        <div style={{ animation: 'artifactPop 0.3s ease forwards' }}>
          {cp.audio_url && <AudioCluePlayer url={cp.audio_url} />}
          
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '14px', padding: '20px', marginBottom: '24px' }}>
            <span style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: T.accent, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: '8px' }}>Cryptic Clue</span>
            <p style={{ fontSize: '16px', lineHeight: '1.65', margin: 0, whiteSpace: 'pre-line', color: '#f0f0f0' }}>{cp.riddle_text}</p>
          </div>

          <form onSubmit={handleVerifyAnswer} autoComplete="off">
            <input
              type="text"
              placeholder="Type your discovery log answer..."
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              disabled={checking}
              style={inputStyle}
            />

            {error && (
              <div style={{ background: T.errorBg, border: `1px solid ${T.errorBorder}`, borderRadius: '10px', padding: '12px', marginBottom: '16px', color: T.errorText, fontSize: '14px', lineHeight: '1.5' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={checking} style={btn({ background: T.accent, color: '#000' })}>
              {checking ? 'Analyzing Log Entry...' : 'Log Answer & Transcribe'}
            </button>
          </form>

          {/* Safe Confirm Hint System Deck */}
          <div style={{ marginTop: '32px', borderTop: `1px solid ${T.border}`, paddingTop: '24px' }}>
            {hintActive ? (
              <div style={{ background: T.surfaceAlt, border: `1px solid ${T.borderMid}`, borderRadius: '12px', padding: '16px', color: '#e0e0e0', fontSize: '14px', lineHeight: '1.6' }}>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: T.accent, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: '4px' }}>Revealed Hint #{hintActive}</span>
                {hintText}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Hint 1 */}
                {confirmHintId === 1 ? (
                  <button onClick={() => handleRequestHint(1)} disabled={hintLoading} style={btn({ background: T.errorBg, color: T.errorText, border: `1px solid ${T.errorBorder}`, fontSize: '13px' })}>
                    {hintLoading ? 'Unlocking...' : `Confirm: Deduct ${cp.hint_penalty || 5} Points`}
                  </button>
                ) : (
                  <button onClick={() => setConfirmHintId(1)} style={btn({ background: T.surface, color: T.muted, border: `1px solid ${T.border}`, fontSize: '13px' })}>
                    Reveal Primary Clue Hint (-{cp.hint_penalty || 5} pts)
                  </button>
                )}

                {/* Hint 2 */}
                {confirmHintId === 2 ? (
                  <button onClick={() => handleRequestHint(2)} disabled={hintLoading} style={btn({ background: T.errorBg, color: T.errorText, border: `1px solid ${T.errorBorder}`, fontSize: '13px' })}>
                    {hintLoading ? 'Unlocking...' : `Confirm: Deduct ${cp.hint_penalty || 5} Points`}
                  </button>
                ) : (
                  <button onClick={() => setConfirmHintId(2)} style={btn({ background: T.surface, color: T.muted, border: `1px solid ${T.border}`, fontSize: '13px' })}>
                    Reveal Secondary Map Hint (-{cp.hint_penalty || 5} pts)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )

  // ── Success view ──
  if (view === 'success') return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, padding: '32px 24px', maxWidth: '480px', margin: '0 auto', paddingBottom: '40px' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '32px', background: T.successBg, border: `1px solid ${T.successBorder}`, padding: '20px', borderRadius: '14px' }}>
        <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>✓</span>
        <h2 style={{ fontSize: '22px', fontWeight: '700', color: T.successText, margin: '0 0 4px' }}>Log Verified</h2>
        <p style={{ fontSize: '13px', color: T.successText, opacity: 0.8, margin: 0 }}>
          Earned +{result.points_earned} Exploration Points
        </p>
      </div>

      {artifact && (
        <div style={{ 
          background: T.surface, 
          border: `1px solid ${T.accent}`, 
          borderRadius: '16px', 
          padding: '20px', 
          marginBottom: '24px', 
          textAlign: 'center',
          animation: 'artifactPop 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' 
        }}>
          <p style={{ fontSize: '11px', fontWeight: '700', color: T.accent, letterSpacing: '.15em', textTransform: 'uppercase', margin: '0 0 16px' }}>
            ✨ Logbook Artefact Recovered ✨
          </p>
          
          {artifact.image_url ? (
            <img src={artifact.image_url} alt={artifact.name} style={{ 
              width: '100%', 
              maxHeight: '280px', 
              objectFit: 'contain', 
              borderRadius: '12px', 
              backgroundColor: '#050505',
              border: `1px solid ${T.border}`,
              marginBottom: '16px'
            }} />
          ) : (
            <div style={{ fontSize: '64px', margin: '24px 0' }}>{artifact.icon || '🎁'}</div>
          )}

          <h3 style={{ fontSize: '19px', fontWeight: '600', color: T.text, margin: '0 0 8px' }}>
            {artifact.name}
          </h3>
          
          <p style={{ fontSize: '14px', color: T.muted, lineHeight: '1.6', margin: '0 0 20px', fontStyle: 'italic' }}>
            "{artifact.flavour_text}"
          </p>

          {artifact.image_url && (
            <div>
              <button onClick={() => downloadArtifact(artifact.image_url, artifact.name)} disabled={downloading}
                style={{ 
                  width: '100%', background: 'transparent', border: `1px solid ${T.accent}`, color: T.accent, 
                  borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: '600', cursor: downloading ? 'default' : 'pointer'
                }}>
                {downloading ? 'Saving to device...' : '↓ Save Artifact Image'}
              </button>
              {downloadError && (
                <p style={{ fontSize: '12px', color: T.errorText, margin: '8px 0 0' }}>
                  Press and hold the image directly to save to your photos.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {result.message && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '12px', padding: '16px', marginBottom: '32px' }}>
          <span style={{ fontSize: '10px', fontWeight: '700', color: T.accent, letterSpacing: '.05em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Next Clue Target</span>
          <p style={{ fontSize: '14px', color: '#e0e0e0', lineHeight: '1.6', margin: 0 }}>{result.message}</p>
        </div>
      )}

      <button
        onClick={() => {
          if (navigator.vibrate) navigator.vibrate(40);
          setTimeout(() => {
            result.next ? navigate('/c/' + result.next) : handleFinalizeAdventure()
          }, 50);
        }}
        style={btn({ background: T.success, color: T.text })}>
        Continue Adventure →
      </button>
    </div>
  )

  // ── Completing view ──
  if (view === 'completing') return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', background: T.bg, color: T.text }}>
      <p style={{ fontSize: '16px', color: T.accent, fontWeight: '600', marginBottom: '8px' }}>Transcribing Journey Logbook...</p>
      <p style={{ fontSize: '14px', color: T.muted, margin: 0 }}>Compiling rewards and coordinates. Please hold position.</p>
    </div>
  )
}