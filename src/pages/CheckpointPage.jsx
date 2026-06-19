
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import GPSGate from '../components/GPSGate'
import { getSession, validateCheckpoint, sendCompletion, getHint } from '../lib/api'
import AnimatedNumber from '../components/AnimatedNumber'

// ─── One-time artifact reveal animation — guarded so Vite's hot-reload in
//     dev doesn't keep stacking duplicate <style> tags into <head>. ───────
if (typeof document !== 'undefined' && !document.getElementById('artifact-pop-keyframes')) {
  const style = document.createElement('style')
  style.id = 'artifact-pop-keyframes'
  style.textContent = `
    @keyframes artifactPop {
      0% { opacity: 0; transform: translateY(20px) scale(0.96); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
  `
  document.head.appendChild(style)
}

// ─── Theme ─────────────────────────────────────────────────────────────────────
// Change colours here — nowhere else needs updating.
const T = {
  bg:          '#0a0a0a',
  surface:     '#111111',
  surfaceAlt:  '#1a1a1a',
  border:      '#1f1f1f',
  borderMid:   '#2a2a2a',
  text:        '#ffffff',
  muted:       '#888888',
  faint:       '#444444',
  accent:      '#C8953A',   // gold — main brand colour
  accentDim:   '#7a5a22',
  success:     '#1D9E75',
  successBg:   '#052e16',
  successBorder:'#166534',
  successText: '#86efac',
  errorBg:     '#2d1212',
  errorBorder: '#991b1b',
  errorText:   '#fca5a5',
  warning:     '#d97706',
}

// ─── Shared style helpers ───────────────────────────────────────────────────────
const btn = (overrides = {}) => ({
  width: '100%',
  padding: '16px',
  border: 'none',
  borderRadius: '12px',
  fontSize: '16px',
  fontWeight: '600',
  cursor: 'pointer',
  ...overrides,
})

const ghostBtn = (overrides = {}) => ({
  background: 'transparent',
  border: 'none',
  color: T.muted,
  fontSize: '13px',
  cursor: 'pointer',
  padding: '8px 0',
  ...overrides,
})

// iOS Safari has no Vibration API — this just becomes a harmless no-op there.
function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern)
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function CheckpointPage() {
  const { slug }  = useParams()
  const navigate  = useNavigate()

  const [session, setSession] = useState(null)
  const [answer, setAnswer]   = useState('')
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [coords, setCoords]   = useState(null)
  const [view, setView]       = useState('story')   // 'story' | 'puzzle' | 'success'
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState(false)
  const [revealedHints, setRevealedHints] = useState([])
  const [hintLoading, setHintLoading] = useState(false)
  const [confirmHint, setConfirmHint] = useState(false)  // two-step hint guard

  // Reset everything when checkpoint slug changes (fixes "Continue Adventure" bug)
  useEffect(() => {
    setSession(null)
    setView('story')
    setResult(null)
    setAnswer('')
    setCoords(null)
    setDownloadError(false)
    setDownloading(false)
    setRevealedHints([])
    setHintLoading(false)
    setConfirmHint(false)

    const sid = localStorage.getItem('session_id')
    if (!sid) { navigate('/'); return }

    getSession(sid).then(data => {
      if (data.error) { navigate('/'); return }
      if (data.status === 'COMPLETE') { navigate('/complete'); return }
      // Redirect if player tries to jump ahead or scan wrong QR
      if (data.current_checkpoint?.slug !== slug) { navigate('/blocked'); return }
      // Restore any hints already revealed for this checkpoint (e.g. on page refresh)
      const hints = data.current_checkpoint?.hints || []
      setRevealedHints(hints.slice(0, data.hints_used || 0))
      setSession(data)
    })
  }, [slug])

  // Two-step hint confirm auto-resets if the player doesn't tap again in time —
  // prevents losing points from an accidental tap while walking.
  useEffect(() => {
    if (!confirmHint) return
    const timer = setTimeout(() => setConfirmHint(false), 3500)
    return () => clearTimeout(timer)
  }, [confirmHint])

  // Fetch the artifact image as a blob so the browser saves it
  // instead of just navigating to it (storage URLs are cross-origin,
  // so a plain <a download> is ignored by most browsers).
  async function downloadArtifact(url, name) {
    setDownloading(true)
    setDownloadError(false)
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const ext  = (blob.type.split('/')[1] || 'jpg').split('+')[0]
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      console.error('Artifact download failed:', err)
      setDownloadError(true)
    }
    setDownloading(false)
  }

  async function revealNextHint() {
    // First tap arms the confirmation; second tap actually fires the request.
    if (!confirmHint) {
      setConfirmHint(true)
      vibrate(40)
      return
    }

    setConfirmHint(false)
    setHintLoading(true)
    const sid = localStorage.getItem('session_id')
    const data = await getHint({
      session_id: sid,
      checkpoint_slug: slug,
      hint_index: revealedHints.length,
    })
    setHintLoading(false)
    if (data.hint) {
      vibrate([60, 40, 60])
      setRevealedHints(h => [...h, data.hint])
    }
  }

  async function handleSubmit() {
    if (!answer.trim() || !coords) return
    setLoading(true)
    setResult(null)

    const sid  = localStorage.getItem('session_id')
    const data = await validateCheckpoint({
      session_id:      sid,
      checkpoint_slug: slug,
      answer,
      player_lat:      coords.lat,
      player_lng:      coords.lng,
    })
    setLoading(false)

    if (data.success && data.is_complete) {
      vibrate([150, 75, 150, 75, 300])
      setView('completing')
      try { await sendCompletion(sid) } catch (err) { console.error('Completion error:', err) }
      navigate('/complete')
      return
    }

    if (data.success) {
      vibrate([100, 50, 100])
      setResult({
        ok:          true,
        message:     data.next_clue,
        next:        data.next_checkpoint?.slug,
        points:      data.points_earned,        // matches edge function response field
        hintPenalty: data.hint_penalty_applied || 0,
      })
      setView('success')
      return
    }

    vibrate(300)
    setResult({ ok: false, message: data.message })
    setAnswer('')
  }

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (!session) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: T.faint }}>
      Loading...
    </div>
  )

  const cp       = session.current_checkpoint
  const artifact = cp.artifact

  // Shared sticky top bar — same on all three in-game views, so progress
  // and score stay visible while scrolling a long riddle or story.
  const stickyBar = (left, right) => (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: '54px',
      background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${T.border}`, display: 'flex',
      justifyContent: 'space-between', alignItems: 'center',
      padding: '0 24px', zIndex: 100,
    }}>
      {left}
      {right}
    </div>
  )

  // ── Story view ────────────────────────────────────────────────────────────────
  if (view === 'story') return (
    <div key="story" className="view-transition" style={{ minHeight: '100vh', padding: '72px 24px 24px', maxWidth: '480px', margin: '0 auto' }}>
      {stickyBar(
        <span style={{ fontSize: '13px', color: T.faint }}>Page {cp.sequence} of {session.total_checkpoints}</span>,
        <span style={{ fontSize: '13px', color: T.accent, fontWeight: '600' }}>{session.total_points} pts</span>
      )}

      <p style={{ fontSize: '11px', fontWeight: '600', color: T.accent, letterSpacing: '.1em',
        textTransform: 'uppercase', marginBottom: '12px' }}>
        Logbook entry
      </p>

      <div className="torn-edge" style={{ borderLeft: `2px solid ${T.accentDim}`, paddingLeft: '16px', marginBottom: '40px' }}>
        <p style={{ fontSize: '15px', color: '#ccc', lineHeight: '1.8', margin: 0 }}>
          {cp.story_snippet}
        </p>
      </div>

      <button onClick={() => { vibrate(30); setView('puzzle') }} style={btn({ background: T.text, color: T.bg })}>
        Continue →
      </button>
    </div>
  )

  // ── Puzzle view (riddle + GPS + answer — all on one screen) ───────────────────
  if (view === 'puzzle') return (
    <div key="puzzle" className="view-transition" style={{ minHeight: '100vh', padding: '72px 24px 24px', maxWidth: '480px', margin: '0 auto' }}>
      {stickyBar(
        <button onClick={() => setView('story')} style={ghostBtn()}>← Back</button>,
        <span style={{ fontSize: '13px', color: T.accent, fontWeight: '600' }}>{session.total_points} pts</span>
      )}

      <p style={{ fontSize: '11px', fontWeight: '600', color: T.accent, letterSpacing: '.1em',
        textTransform: 'uppercase', marginBottom: '12px' }}>
        The riddle
      </p>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: '12px', padding: '18px', marginBottom: '24px' }}>
        <p style={{ fontSize: '16px', fontWeight: '500', lineHeight: '1.65',
          color: T.text, margin: 0 }}>
          {cp.riddle_text}
        </p>
      </div>

      {/* Hints — revealed one at a time, each costs points */}
      {cp.hints && cp.hints.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          {revealedHints.map((h, i) => (
            <div key={i} style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`,
              borderRadius: '10px', padding: '12px 14px', marginBottom: '8px' }}>
              <p style={{ fontSize: '11px', fontWeight: '700', color: T.accent,
                letterSpacing: '.08em', textTransform: 'uppercase', margin: '0 0 4px' }}>
                Hint {i + 1}
              </p>
              <p style={{ fontSize: '13px', color: T.muted, lineHeight: '1.6', margin: 0 }}>
                {h}
              </p>
            </div>
          ))}

          {/* Immediate running-cost feedback, shown as soon as a hint is revealed */}
          {revealedHints.length > 0 && (
            <p style={{ fontSize: '12px', color: T.errorText, margin: '0 0 10px', fontWeight: '600' }}>
              −{revealedHints.length * cp.hint_penalty} pts deducted so far
            </p>
          )}

          {revealedHints.length < cp.hints.length && (
            <button onClick={revealNextHint} disabled={hintLoading}
              style={{
                width: '100%', background: 'transparent',
                border: `1px solid ${confirmHint ? T.warning : T.accent}`,
                color: confirmHint ? T.warning : T.accent,
                borderRadius: '8px', padding: '12px 14px',
                fontSize: '13px', fontWeight: '600', cursor: hintLoading ? 'default' : 'pointer',
                opacity: hintLoading ? 0.6 : 1, transition: 'all 0.2s ease',
              }}>
              {hintLoading
                ? 'Loading...'
                : confirmHint
                  ? `Tap again to confirm (-${cp.hint_penalty} pts)`
                  : `Need a hint? (-${cp.hint_penalty} pts)`}
            </button>
          )}
        </div>
      )}

      {/* GPS verification — auto-requests on load, onReady just sets coords, no view change */}
      <GPSGate checkpoint={cp} onReady={setCoords} autoRequest={true} />

      {/* Answer input — appears once GPS is verified */}
      {coords && (
        <>
          <input
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Your answer..."
            autoFocus
            style={{
              width: '100%',
              background: T.surface,
              border: `1px solid ${T.borderMid}`,
              borderRadius: '12px',
              padding: '16px',
              color: T.text,
              fontSize: '17px',
              marginBottom: '12px',
              boxSizing: 'border-box',
            }}
          />

          <button onClick={handleSubmit} disabled={loading || !answer.trim()}
            style={btn({ background: T.text, color: T.bg, opacity: loading || !answer.trim() ? 0.5 : 1 })}>
            {loading ? 'Checking...' : 'Submit Answer'}
          </button>

          {result && !result.ok && (
            <div style={{ marginTop: '20px', padding: '16px', borderRadius: '10px',
              background: T.errorBg, border: `1px solid ${T.errorBorder}` }}>
              <p style={{ color: T.errorText, fontSize: '14px', lineHeight: '1.65', margin: 0 }}>
                {result.message}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )

  // ── Success view ──────────────────────────────────────────────────────────────
  if (view === 'success' && result?.ok) return (
    <div key="success" className="view-transition" style={{ minHeight: '100vh', padding: '72px 24px 24px', maxWidth: '480px', margin: '0 auto' }}>
      {stickyBar(
        <span style={{ fontSize: '13px', color: T.faint }}>Page {cp.sequence} of {session.total_checkpoints}</span>,
        <span style={{ fontSize: '13px', color: T.accent, fontWeight: '600' }}>{session.total_points + (result.points || 0)} pts</span>
      )}

      {/* Points earned banner */}
      <div style={{ textAlign: 'center', marginBottom: '28px', marginTop: '12px' }}>
        <div style={{ fontSize: '44px', fontWeight: '700', color: T.success, lineHeight: 1 }}>
          +<AnimatedNumber value={result.points} />
        </div>
        <p style={{ fontSize: '13px', color: T.muted, marginTop: '6px' }}>
          points earned
        </p>
        {result.hintPenalty > 0 && (
          <p style={{ fontSize: '12px', color: T.faint, marginTop: '4px' }}>
            (-{result.hintPenalty} pts for hints used)
          </p>
        )}
      </div>

      {/* Artifact card — shows uploaded image, falls back to emoji icon */}
      {artifact && (
        <div style={{
          background: T.surface, border: `1px solid ${T.accentDim}`,
          borderRadius: '14px', padding: '20px', marginBottom: '20px',
          animation: 'artifactPop 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        }}>
          <p style={{ fontSize: '10px', fontWeight: '700', color: T.accent, letterSpacing: '.12em',
            textTransform: 'uppercase', margin: '0 0 10px' }}>
            Artefact recovered
          </p>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            {artifact.image_url ? (
              <img src={artifact.image_url} alt={artifact.name}
                style={{ width: '56px', height: '56px', objectFit: 'cover',
                  borderRadius: '8px', flexShrink: 0, border: `1px solid ${T.border}` }} />
            ) : (
              <span style={{ fontSize: '36px', lineHeight: 1, flexShrink: 0 }}>{artifact.icon || '🎁'}</span>
            )}
            <div>
              <p className="font-serif" style={{ fontSize: '17px', fontWeight: '600', color: T.text, margin: '0 0 4px' }}>
                {artifact.name}
              </p>
              <p style={{ fontSize: '13px', color: T.muted, lineHeight: '1.6', margin: 0 }}>
                {artifact.flavour_text}
              </p>
            </div>
          </div>

          {artifact.image_url && (
            <div style={{ marginTop: '14px' }}>
              <button onClick={() => downloadArtifact(artifact.image_url, artifact.name)}
                disabled={downloading}
                style={{
                  background: 'transparent', border: `1px solid ${T.accentDim}`,
                  color: T.accent, borderRadius: '8px', padding: '9px 16px',
                  fontSize: '13px', fontWeight: '600', cursor: downloading ? 'default' : 'pointer',
                  opacity: downloading ? 0.6 : 1,
                }}>
                {downloading ? 'Saving...' : '↓ Save artifact'}
              </button>
              {downloadError && (
                <p style={{ fontSize: '12px', color: T.errorText, margin: '8px 0 0' }}>
                  Couldn't save automatically — try long-pressing the image above to save it.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Next clue */}
      {result.message && (
        <div style={{ background: T.successBg, border: `1px solid ${T.successBorder}`,
          borderRadius: '10px', padding: '14px', marginBottom: '24px' }}>
          <p style={{ fontSize: '11px', fontWeight: '600', color: T.success, letterSpacing: '.08em',
            textTransform: 'uppercase', margin: '0 0 6px' }}>
            Next clue
          </p>
          <p style={{ fontSize: '14px', color: T.successText, lineHeight: '1.65', margin: 0 }}>
            {result.message}
          </p>
        </div>
      )}

      <button
        onClick={() => result.next ? navigate('/c/' + result.next) : navigate('/complete')}
        style={btn({ background: T.success, color: T.text })}>
        Continue Adventure →
      </button>
    </div>
  )

  // ── Completing view (awaiting sendCompletion) ───────────────────────────────
  if (view === 'completing') return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '20px' }}>🦈</div>
      <p style={{ color: T.muted, fontSize: '14px' }}>Preparing your rewards...</p>
    </div>
  )

  // Fallback (shouldn't normally render)
  return null
}