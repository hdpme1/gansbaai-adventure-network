import { useState, useRef, useEffect } from 'react'

export default function AudioCluePlayer({ url }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress]   = useState(0)
  const audioRef = useRef(null)

  useEffect(() => {
    // Reset player state if the URL changes between checkpoints
    setIsPlaying(false)
    setProgress(0)
    if (audioRef.current) {
      audioRef.current.load()
    }
  }, [url])

  function togglePlay() {
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(err => console.log("Audio play blocked:", err))
    }
    setIsPlaying(!isPlaying)
    if (navigator.vibrate) navigator.vibrate(30)
  }

  function handleTimeUpdate() {
    const current = audioRef.current.currentTime
    const duration = audioRef.current.duration || 1
    setProgress((current / duration) * 100)
  }

  function handleAudioEnded() {
    setIsPlaying(false)
    setProgress(0)
  }

  return (
    <div style={{
      background: '#161616',
      border: '1px solid #C8953A40',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    }}>
      <audio 
        ref={audioRef} 
        src={url} 
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleAudioEnded}
        preload="auto"
      />

      {/* Play/Pause Trigger Circle */}
      <button type="button" onClick={togglePlay} style={{
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        background: '#C8953A',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
      }}>
        {isPlaying ? (
          // Pause Icon
          <svg width="14" height="16" viewBox="0 0 14 16" fill="none"><rect width="4" height="16" rx="1" fill="#0A0A0A"/><rect x="10" width="4" height="16" rx="1" fill="#0A0A0A"/></svg>
        ) : (
          // Play Icon
          <svg width="16" height="18" viewBox="0 0 16 18" fill="none" style={{ marginLeft: '2px' }}><path d="M14.5 7.40192C15.8333 8.17172 15.8333 10.0962 14.5 10.866L3.25 17.3612C1.91667 18.131 -0.249999 17.1688 -0.249999 15.6269L-0.25 2.63109C-0.25 1.08919 1.91667 0.126938 3.25 0.896739L14.5 7.40192Z" fill="#0A0A0A"/></svg>
        )}
      </button>

      {/* Track metadata details and custom seeking progress wrapper */}
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '11px', fontWeight: '700', color: '#C8953A', letterSpacing: '.08em', textTransform: 'uppercase', margin: '0 0 6px' }}>
          🔊 Audio Evidence Clue
        </p>
        <div style={{ width: '100%', height: '4px', background: '#2a2a2a', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: '#C8953A', transition: 'width 0.1s linear' }} />
        </div>
      </div>
    </div>
  )
}