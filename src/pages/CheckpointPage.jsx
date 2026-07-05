import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import GPSGate from '../components/GPSGate'
import AudioCluePlayer from '../components/AudioCluePlayer'
import { getSession, validateCheckpoint, sendCompletion, getHint } from '../lib/api'
import { getActiveSessionId, clearAllSessions } from '../lib/session'
import AnimatedNumber from '../components/AnimatedNumber'
import {
  L, D, NIGHT_INK, ROUTE_BLUE, UNLOCK_LIME, SIGNAL_CORAL, WEIGHT
} from '../lib/theme'

// Story + puzzle views  → light surface (Map Cream)
// Success / arrival     → dramatic dark (Night Ink + Lime)  — matches brand UI concepts

const pill = (custom = {}) => ({
  width: '100%', padding: '16px 24px', borderRadius: '100px',
  fontSize: '15px', fontWeight: WEIGHT.semiBold, letterSpacing: '.06em',
  textTransform: 'uppercase', cursor: 'pointer', border: 'none',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  ...custom
})

export default function CheckpointPage() {
  const { slug } = useParams()
  const navigate  = useNavigate()

  const [session,          setSession]          = useState(null)
  const [loading,          setLoading]          = useState(true)
  const [view,             setView]             = useState('story')
  const [answer,           setAnswer]           = useState('')
  const [coords,           setCoords]           = useState(null)
  const [error,            setError]            = useState('')
  const [checking,         setChecking]         = useState(false)
  const [result,           setResult]           = useState({ next: null, message: '', points_earned: 0 })
  const [collectable,      setCollectable]       = useState(null)  // earned collectable from validate-checkpoint
  const [collectableOpen,  setCollectableOpen]   = useState(false) // 3D viewer modal
  const [downloading,      setDownloading]      = useState(false)
  const [downloadError,    setDownloadError]    = useState(false)
  const [artifactModalOpen,setArtifactModalOpen]= useState(false)
  const [revealedHints,    setRevealedHints]    = useState({})
  const [hintLoading,      setHintLoading]      = useState(false)
  const [confirmHintId,    setConfirmHintId]    = useState(null)

  const bgAudioRef = useRef(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setAnswer('')
    setCoords(null)
    setRevealedHints({})
    setConfirmHintId(null)

    const sid = getActiveSessionId()
    if (!sid) { navigate('/'); return }

    getSession(sid)
      .then(data => {
        if (!active) return
        if (data.error) { clearAllSessions(); navigate('/'); return }
        setSession(data)
        const cp = data.current_checkpoint
        if (!cp) { navigate('/'); return }
        if (cp.slug !== slug) { navigate('/c/' + cp.slug); return }
        setView('story')
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setError('Connection issue — check your signal and try again.')
        setLoading(false)
      })

    return () => { active = false }
  }, [slug, navigate])

  useEffect(() => {
    return () => { if (bgAudioRef.current) bgAudioRef.current.pause() }
  }, [])

  if (loading || !session) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: L.bg, color: L.muted }}>
      {error
        ? <div style={{ textAlign: 'center', padding: '24px' }}>
            <p style={{ color: SIGNAL_CORAL, marginBottom: '16px', fontSize: '15px' }}>{error}</p>
            <button onClick={() => window.location.reload()} style={pill({ background: ROUTE_BLUE, color: '#fff', width: 'auto', padding: '12px 28px' })}>
              Try Again
            </button>
          </div>
        : <p style={{ fontSize: '14px' }}>Loading spot...</p>
      }
    </div>
  )

  const cp       = session.current_checkpoint
  if (!cp) return null
  const artifact = cp.artifact

  if (!bgAudioRef.current && session.adventure?.ambient_audio_url) {
    bgAudioRef.current = new Audio(session.adventure.ambient_audio_url)
    bgAudioRef.current.loop   = true
    bgAudioRef.current.volume = 0.2
  }

  function handleStartPuzzle() {
    if (navigator.vibrate) navigator.vibrate(40)
    bgAudioRef.current?.play().catch(() => {})
    setView('puzzle')
  }

  async function handleVerifyAnswer(e) {
    e.preventDefault()
    if (!answer.trim() || checking) return
    setChecking(true)
    setError('')
    try {
      const res = await validateCheckpoint({
        session_id:      session.session_id,
        checkpoint_slug: cp.slug,
        answer:          answer.trim(),
        player_lat:      coords?.lat,
        player_lng:      coords?.lng,
      })
      if (!res.success) {
        setError(res.message || 'Not quite — try again.')
        if (navigator.vibrate) navigator.vibrate([60, 40, 60])
        return
      }
      if (navigator.vibrate) navigator.vibrate(120)
      setResult({
        next:          res.is_complete ? null : res.next_checkpoint?.slug,
        message:       res.is_complete ? '' : (res.next_clue || cp.next_clue || ''),
        points_earned: res.points_earned || 0,
      })
      setSession(prev => ({ ...prev, total_points: res.total_points }))

      // Store any collectable earned at this spot
      if (res.collectable_earned) {
        setCollectable(res.collectable_earned)
        setCollectableOpen(true)
      }
      setView('success')
      setArtifactModalOpen(true)
    } catch {
      setError('Network error — try submitting again.')
    } finally {
      setChecking(false)
    }
  }

  async function handleRequestHint(hintNumber) {
    if (hintLoading) return
    setHintLoading(true)
    try {
      const data = await getHint({
        session_id:      session.session_id,
        checkpoint_slug: cp.slug,
        hint_index:      hintNumber - 1,
      })
      if (data.error) {
        setError(data.message || data.error)
      } else {
        setRevealedHints(prev => ({ ...prev, [hintNumber]: data.hint }))
        setConfirmHintId(null)
      }
    } catch {
      setError('Could not retrieve hint.')
    } finally {
      setHintLoading(false)
    }
  }

  async function handleFinalizeAdventure() {
    setView('completing')
    const sid = session.session_id
    try {
      await sendCompletion(sid)
      if (navigator.vibrate) navigator.vibrate([40, 40, 40])
    } catch { /* still navigate even on network error */ }
    navigate('/complete?sid=' + sid)
  }

  async function downloadArtifact(url, name) {
    setDownloading(true)
    setDownloadError(false)
    try {
      const res    = await fetch(url)
      const blob   = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a      = document.createElement('a')
      a.href       = blobUrl
      a.download   = `${name.toLowerCase().replace(/\s+/g, '-')}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
    } catch {
      setDownloadError(true)
    } finally {
      setDownloading(false)
    }
  }

  // ── STORY VIEW — light surface ──────────────────────────────────────────────
  if (view === 'story') return (
    <div style={{ minHeight: '100vh', background: L.bg, color: L.ink,
      padding: '32px 24px', maxWidth: '480px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: WEIGHT.semiBold,
            color: ROUTE_BLUE, letterSpacing: '.1em', textTransform: 'uppercase' }}>
            Spot {cp.sequence} / {session.total_checkpoints || '?'}
          </span>
          <h2 style={{ fontSize: '22px', fontWeight: WEIGHT.black,
            textTransform: 'uppercase', margin: '4px 0 0', letterSpacing: '-.01em' }}>
            {cp.slug.replace(/-/g, ' ')}
          </h2>
        </div>
        <div style={{ background: NIGHT_INK, color: UNLOCK_LIME,
          padding: '8px 14px', borderRadius: '10px', textAlign: 'right', flexShrink: 0 }}>
          <span style={{ display: 'block', fontSize: '9px', color: '#8A8A9A',
            textTransform: 'uppercase', fontWeight: WEIGHT.semiBold }}>Score</span>
          <span style={{ fontSize: '18px', fontWeight: WEIGHT.black }}>
            <AnimatedNumber value={session.total_points || 0} />
          </span>
        </div>
      </div>

      {/* Story snippet */}
      <div style={{ background: '#FFFFFF', border: `1.5px solid ${L.border}`,
        borderRadius: '16px', padding: '24px', marginBottom: '32px',
        fontSize: '17px', lineHeight: '1.8', color: L.ink,
        fontWeight: WEIGHT.regular }}>
        {cp.story_snippet}
      </div>

      <button onClick={handleStartPuzzle} style={pill({ background: ROUTE_BLUE, color: '#fff' })}>
        Find the Spot →
      </button>
    </div>
  )

  // ── PUZZLE VIEW — light surface ─────────────────────────────────────────────
  if (view === 'puzzle') return (
    <div style={{ minHeight: '100vh', background: L.bg, color: L.ink,
      padding: '32px 24px', maxWidth: '480px', margin: '0 auto', paddingBottom: '60px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: WEIGHT.semiBold,
            color: ROUTE_BLUE, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Spot {cp.sequence}
          </span>
          <h2 style={{ fontSize: '20px', fontWeight: WEIGHT.black,
            textTransform: 'uppercase', margin: '2px 0 0' }}>
            Spot Lock
          </h2>
        </div>
        <div style={{ background: NIGHT_INK, color: UNLOCK_LIME,
          padding: '6px 12px', borderRadius: '10px' }}>
          <span style={{ fontSize: '15px', fontWeight: WEIGHT.black }}>
            <AnimatedNumber value={session.total_points || 0} />
            <span style={{ fontSize: '10px', color: '#8A8A9A', marginLeft: '3px' }}>PTS</span>
          </span>
        </div>
      </div>

      <GPSGate checkpoint={cp} sessionId={session.session_id} onReady={setCoords} autoRequest />

      {coords && (
        <div className="view-transition">
          {cp.clue_audio_url && <AudioCluePlayer url={cp.clue_audio_url} />}

          {/* Clue card */}
          <div style={{ background: '#FFFFFF', border: `1.5px solid ${L.border}`,
            borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
            <span style={{ display: 'block', fontSize: '11px', fontWeight: WEIGHT.semiBold,
              color: ROUTE_BLUE, letterSpacing: '.08em', textTransform: 'uppercase',
              marginBottom: '10px' }}>
              Cryptic Clue
            </span>
            <p style={{ fontSize: '16px', lineHeight: '1.7', margin: 0,
              whiteSpace: 'pre-line', color: L.ink, fontWeight: WEIGHT.regular }}>
              {cp.riddle_text}
            </p>
          </div>

          <form onSubmit={handleVerifyAnswer} autoComplete="off">
            <label style={{ display: 'block', fontSize: '11px', fontWeight: WEIGHT.semiBold,
              color: L.muted, letterSpacing: '.08em', textTransform: 'uppercase',
              marginBottom: '8px' }}>
              Your Answer
            </label>
            <input
              type="text"
              placeholder="Type your answer..."
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              disabled={checking}
              style={{ width: '100%', background: '#fff', border: `1.5px solid ${L.border}`,
                borderRadius: '12px', padding: '16px', color: L.ink, fontSize: '16px',
                fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
                marginBottom: '12px', outline: 'none' }}
            />

            {error && (
              <div style={{ background: L.errorBg, border: `1px solid ${L.errorBorder}`,
                borderRadius: '10px', padding: '12px', marginBottom: '12px',
                color: L.errorText, fontSize: '14px', lineHeight: '1.5' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={checking}
              style={pill({ background: ROUTE_BLUE, color: '#fff' })}>
              {checking ? 'Checking...' : 'Check Answer'}
            </button>
          </form>

          {/* Hints */}
          <div style={{ marginTop: '28px', paddingTop: '24px',
            borderTop: `1.5px solid ${L.border}`, display: 'flex',
            flexDirection: 'column', gap: '10px' }}>

            {revealedHints[1] && (
              <div style={{ background: '#FFFFFF', border: `1.5px solid ${L.border}`,
                borderRadius: '12px', padding: '16px', fontSize: '14px',
                lineHeight: '1.6', color: L.ink }}>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: WEIGHT.semiBold,
                  color: ROUTE_BLUE, letterSpacing: '.08em', textTransform: 'uppercase',
                  marginBottom: '6px' }}>Hint 1</span>
                {revealedHints[1]}
              </div>
            )}

            {revealedHints[2] && (
              <div style={{ background: '#FFFFFF', border: `1.5px solid ${L.border}`,
                borderRadius: '12px', padding: '16px', fontSize: '14px',
                lineHeight: '1.6', color: L.ink }}>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: WEIGHT.semiBold,
                  color: ROUTE_BLUE, letterSpacing: '.08em', textTransform: 'uppercase',
                  marginBottom: '6px' }}>Hint 2</span>
                {revealedHints[2]}
              </div>
            )}

            {!revealedHints[1] && (cp.hints?.length || 0) >= 1 && (
              confirmHintId === 1
                ? <button onClick={() => handleRequestHint(1)} disabled={hintLoading}
                    style={pill({ background: L.errorBg, color: L.errorText,
                      border: `1px solid ${L.errorBorder}`, fontSize: '13px' })}>
                    {hintLoading ? 'Loading...' : `Confirm: −${cp.hint_penalty || 5} pts`}
                  </button>
                : <button onClick={() => setConfirmHintId(1)}
                    style={pill({ background: '#fff', color: L.muted,
                      border: `1.5px solid ${L.border}`, fontSize: '13px' })}>
                    Use a Hint −{cp.hint_penalty || 5} pts
                  </button>
            )}

            {revealedHints[1] && !revealedHints[2] && (cp.hints?.length || 0) >= 2 && (
              confirmHintId === 2
                ? <button onClick={() => handleRequestHint(2)} disabled={hintLoading}
                    style={pill({ background: L.errorBg, color: L.errorText,
                      border: `1px solid ${L.errorBorder}`, fontSize: '13px' })}>
                    {hintLoading ? 'Loading...' : `Confirm: −${cp.hint_penalty || 5} pts`}
                  </button>
                : <button onClick={() => setConfirmHintId(2)}
                    style={pill({ background: '#fff', color: L.muted,
                      border: `1.5px solid ${L.border}`, fontSize: '13px' })}>
                    Use Second Hint −{cp.hint_penalty || 5} pts
                  </button>
            )}
          </div>
        </div>
      )}
    </div>
  )

  // ── SUCCESS / ARRIVAL VIEW — dark dramatic ──────────────────────────────────
  if (view === 'success') return (
    <div className="reveal-transition" style={{ minHeight: '100vh', background: NIGHT_INK,
      color: '#fff', padding: '32px 24px', maxWidth: '480px',
      margin: '0 auto', paddingBottom: '48px' }}>

      {/* SPOT FOUND hero */}
      <div style={{ textAlign: 'center', paddingTop: '24px', marginBottom: '32px' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>📍</div>
        <h1 className="font-display" style={{ fontSize: '48px', color: UNLOCK_LIME,
          margin: '0 0 4px', lineHeight: 1 }}>
          SPOT<br />FOUND.
        </h1>
        <p style={{ fontSize: '15px', color: '#8A8A9A', margin: '12px 0 0' }}>
          +{result.points_earned} Points
        </p>
      </div>

      {/* Artifact — inline card */}
      {artifact && (
        <div style={{ background: D.surface, border: `1.5px solid ${UNLOCK_LIME}40`,
          borderRadius: '16px', padding: '20px', marginBottom: '24px',
          textAlign: 'center',
          animation: 'artifactPop 0.45s cubic-bezier(0.175,0.885,0.32,1.275) forwards' }}>

          <p style={{ fontSize: '11px', fontWeight: WEIGHT.semiBold, color: UNLOCK_LIME,
            letterSpacing: '.12em', textTransform: 'uppercase', margin: '0 0 16px' }}>
            Reveal Unlocked
          </p>

          {artifact.image_url ? (
            <img src={artifact.image_url} alt={artifact.name}
              onClick={() => setArtifactModalOpen(true)}
              style={{ width: '100%', maxHeight: '260px', objectFit: 'contain',
                borderRadius: '12px', border: `1px solid ${D.border}`,
                marginBottom: '16px', cursor: 'pointer', background: '#000' }} />
          ) : (
            <div style={{ fontSize: '72px', margin: '16px 0' }}>{artifact.icon || '🎁'}</div>
          )}

          <h3 style={{ fontSize: '18px', fontWeight: WEIGHT.black,
            textTransform: 'uppercase', color: '#fff', margin: '0 0 8px' }}>
            {artifact.name}
          </h3>
          <p style={{ fontSize: '14px', color: D.muted, lineHeight: '1.6',
            margin: '0 0 16px' }}>
            {artifact.flavour_text}
          </p>

          {artifact.image_url && (
            <>
              <button onClick={() => downloadArtifact(artifact.image_url, artifact.name)}
                disabled={downloading}
                style={pill({ background: 'transparent', color: UNLOCK_LIME,
                  border: `1.5px solid ${UNLOCK_LIME}`, fontSize: '13px' })}>
                {downloading ? 'Saving...' : '↓ Save Reveal Image'}
              </button>
              {downloadError && (
                <p style={{ fontSize: '12px', color: SIGNAL_CORAL, marginTop: '8px' }}>
                  Press and hold the image to save to your photos.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Collectable — 3D model earned at this spot */}
      {collectable && (
        <div style={{ background: D.surface, border: `1.5px solid ${ROUTE_BLUE}60`,
          borderRadius: '16px', padding: '20px', marginBottom: '24px',
          textAlign: 'center',
          animation: 'artifactPop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards' }}>

          <p style={{ fontSize: '11px', fontWeight: WEIGHT.semiBold, color: ROUTE_BLUE,
            letterSpacing: '.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>
            🎲 Collectable Found
          </p>

          {collectable.thumbnail_url ? (
            <img src={collectable.thumbnail_url} alt={collectable.name}
              style={{ width: '120px', height: '120px', objectFit: 'cover',
                borderRadius: '12px', marginBottom: '12px', background: D.surfaceAlt }} />
          ) : (
            <div style={{ fontSize: '56px', margin: '8px 0 12px' }}>🗿</div>
          )}

          <h3 style={{ fontSize: '16px', fontWeight: WEIGHT.black,
            textTransform: 'uppercase', color: '#fff', margin: '0 0 4px' }}>
            {collectable.name}
          </h3>
          <p style={{ fontSize: '11px', fontWeight: WEIGHT.semiBold,
            color: ROUTE_BLUE, letterSpacing: '.08em', textTransform: 'uppercase',
            margin: '0 0 14px' }}>
            {collectable.rarity}
          </p>

          <button onClick={() => setCollectableOpen(true)}
            style={pill({ background: ROUTE_BLUE, color: '#fff', fontSize: '13px',
              padding: '12px 24px' })}>
            View in 3D
          </button>
        </div>
      )}

      {/* Next clue */}
      {result.message && (
        <div style={{ background: D.surface, border: `1px solid ${D.border}`,
          borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
          <span style={{ display: 'block', fontSize: '10px', fontWeight: WEIGHT.semiBold,
            color: ROUTE_BLUE, letterSpacing: '.1em', textTransform: 'uppercase',
            marginBottom: '8px' }}>Next Clue</span>
          <p style={{ fontSize: '14px', color: '#e0e0e0', lineHeight: '1.6', margin: 0 }}>
            {result.message}
          </p>
        </div>
      )}

      <button
        onClick={() => {
          if (navigator.vibrate) navigator.vibrate(40)
          setTimeout(() => {
            result.next ? navigate('/c/' + result.next) : handleFinalizeAdventure()
          }, 50)
        }}
        style={pill({ background: UNLOCK_LIME, color: NIGHT_INK })}>
        {result.next ? 'Next Clue Unlocked →' : 'Complete the Chase →'}
      </button>

      {/* Collectable 3D viewer modal */}
      {collectable && collectableOpen && (
        <div onClick={() => setCollectableOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.97)', zIndex: 1001,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '24px',
          animation: 'artifactPop 0.3s ease forwards' }}>

          <button onClick={e => { e.stopPropagation(); setCollectableOpen(false) }}
            style={{ position: 'absolute', top: '20px', right: '20px',
              width: '40px', height: '40px', borderRadius: '50%',
              background: D.surface, border: `1px solid ${D.border}`,
              color: '#fff', fontSize: '18px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1002 }}>
            ✕
          </button>

          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '480px', textAlign: 'center' }}>

            <p style={{ fontSize: '11px', fontWeight: WEIGHT.semiBold, color: ROUTE_BLUE,
              letterSpacing: '.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>
              {collectable.rarity} Collectable
            </p>

            {/* Google model-viewer — GLB renderer with AR on iOS + Android */}
            <model-viewer
              src={collectable.model_url}
              poster={collectable.thumbnail_url || ''}
              auto-rotate
              camera-controls
              ar
              ar-modes="webxr scene-viewer quick-look"
              shadow-intensity="1"
              environment-image="neutral"
              style={{
                width: '100%',
                height: '320px',
                borderRadius: '16px',
                background: D.surface,
                '--poster-color': NIGHT_INK,
              }}
            />

            <h3 className="font-display" style={{ fontSize: '22px', color: '#fff',
              margin: '16px 0 6px' }}>
              {collectable.name}
            </h3>
            {collectable.description && (
              <p style={{ fontSize: '13px', color: D.muted, lineHeight: '1.6',
                margin: '0 0 16px' }}>
                {collectable.description}
              </p>
            )}
            <p style={{ fontSize: '11px', color: D.faint, margin: '0 0 20px' }}>
              Added to your Display Case
            </p>

            <button onClick={() => setCollectableOpen(false)}
              style={pill({ background: ROUTE_BLUE, color: '#fff' })}>
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen artifact modal */}
      {artifact && artifactModalOpen && (
        <div onClick={() => setArtifactModalOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 1000,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '24px',
          animation: 'artifactPop 0.3s ease forwards' }}>
          <button onClick={e => { e.stopPropagation(); setArtifactModalOpen(false) }}
            style={{ position: 'absolute', top: '20px', right: '20px',
              width: '40px', height: '40px', borderRadius: '50%',
              background: D.surface, border: `1px solid ${D.border}`,
              color: '#fff', fontSize: '18px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ✕
          </button>
          <div onClick={e => e.stopPropagation()}
            style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: WEIGHT.semiBold, color: UNLOCK_LIME,
              letterSpacing: '.15em', textTransform: 'uppercase', margin: '0 0 20px' }}>
              Reveal Unlocked
            </p>
            {artifact.image_url
              ? <img src={artifact.image_url} alt={artifact.name} style={{
                  width: '100%', maxHeight: '60vh', objectFit: 'contain',
                  borderRadius: '12px', border: `1px solid ${UNLOCK_LIME}40`,
                  marginBottom: '20px' }} />
              : <div style={{ fontSize: '96px', margin: '24px 0' }}>{artifact.icon || '🎁'}</div>
            }
            <h3 className="font-display" style={{ fontSize: '24px', color: '#fff',
              margin: '0 0 10px' }}>{artifact.name}</h3>
            <p style={{ fontSize: '14px', color: D.muted, lineHeight: '1.6',
              margin: '0 0 24px' }}>{artifact.flavour_text}</p>
            <button onClick={() => setArtifactModalOpen(false)}
              style={pill({ background: UNLOCK_LIME, color: NIGHT_INK })}>
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  )

  // ── COMPLETING VIEW ─────────────────────────────────────────────────────────
  if (view === 'completing') return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      padding: '24px', background: NIGHT_INK }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏆</div>
      <h2 className="font-display" style={{ fontSize: '32px', color: UNLOCK_LIME,
        margin: '0 0 8px' }}>TOWN CRACKED.</h2>
      <p style={{ fontSize: '14px', color: '#8A8A9A' }}>Tallying your score...</p>
    </div>
  )
}