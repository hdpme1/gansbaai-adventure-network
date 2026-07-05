import { useState, useEffect, useRef } from 'react'
import { getProximity } from '../lib/api'
import { L, D, NIGHT_INK, ROUTE_BLUE, UNLOCK_LIME, SIGNAL_CORAL, WEIGHT } from '../lib/theme'

// Circular proximity gauge — fills as the player gets closer.
function ProximityRing({ pct, color }) {
  const size = 88, strokeWidth = 7
  const r             = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const offset        = circumference * (1 - Math.max(0, Math.min(100, pct)) / 100)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={L.borderMid} strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s ease' }} />
    </svg>
  )
}

const MIN_INTERVAL_MS = 3000

export default function GPSGate({ checkpoint, sessionId, onReady, autoRequest = false }) {
  const [status,   setStatus]   = useState('idle')
  const [distance, setDistance] = useState(null)
  const [pct,      setPct]      = useState(0)

  const watchIdRef    = useRef(null)
  const readyFiredRef = useRef(false)
  const lastCallRef   = useRef(0)

  function stopWatch() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }

  async function callProximity(lat, lng) {
    const now = Date.now()
    if (now - lastCallRef.current < MIN_INTERVAL_MS) return
    lastCallRef.current = now
    try {
      const result = await getProximity(sessionId, lat, lng)
      if (result.error) return
      setDistance(result.distance_meters)
      setPct(result.percentage)
      if (result.is_inside) {
        setStatus('ready')
        if (!readyFiredRef.current) {
          readyFiredRef.current = true
          onReady({ lat, lng })
        }
        stopWatch()
      } else {
        setStatus('far')
      }
    } catch { /* silently keep last state */ }
  }

  function startWatch() {
    if (!navigator.geolocation) { setStatus('denied'); return }
    stopWatch()
    readyFiredRef.current = false
    lastCallRef.current   = 0
    setStatus('locating')
    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords: { latitude, longitude } }) => callProximity(latitude, longitude),
      () => setStatus('denied'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    )
  }

  useEffect(() => {
    stopWatch()
    readyFiredRef.current = false
    lastCallRef.current   = 0
    setStatus('idle')
    setDistance(null)
    setPct(0)
    if (autoRequest) startWatch()
    return () => stopWatch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkpoint.id])

  // Hot/warm/cold based on server-returned percentage
  let statusMsg   = 'Checking your position...'
  let statusColor = L.muted

  if (status === 'idle') {
    statusMsg   = 'We need to confirm you\'re at this Spot before revealing the clue.'
    statusColor = L.muted
  } else if (status === 'locating') {
    statusMsg   = '📡 Getting your location...'
    statusColor = ROUTE_BLUE
  } else if (status === 'ready') {
    statusMsg   = 'SPOT FOUND.'
    statusColor = '#006B35'
  } else if (status === 'denied') {
    statusMsg   = 'Location access denied. Enable GPS in your browser settings, then try again.'
    statusColor = SIGNAL_CORAL
  } else if (status === 'far' && distance !== null) {
    if (pct < 33) {
      statusMsg   = `❄️ Cold — ${distance}m away. Look at your location clues.`
      statusColor = ROUTE_BLUE
    } else if (pct < 66) {
      statusMsg   = `🌤️ Warm — ${distance}m away. You're heading the right way.`
      statusColor = '#f59e0b'
    } else {
      statusMsg   = `🔥 Hot! Only ${distance}m away. Look closely around you.`
      statusColor = SIGNAL_CORAL
    }
  }

  const showRing = (status === 'far' || status === 'ready') && distance !== null
  const showBtn  = status === 'idle' || status === 'far' || status === 'denied'
  const btnLabel = status === 'idle' ? 'Verify Location' : status === 'denied' ? 'Try Again' : 'Scan Again'

  // On light background (puzzle view context)
  return (
    <div style={{ marginBottom: '24px', padding: '16px',
      background: '#FFFFFF', borderRadius: '14px',
      border: `1.5px solid ${status === 'ready' ? '#A8EFC0' : status === 'far' && pct > 65 ? SIGNAL_CORAL + '60' : L.border}`,
      display: 'flex', alignItems: 'center', gap: '16px',
      transition: 'border-color 0.3s ease' }}>

      {showRing && (
        <ProximityRing
          pct={status === 'ready' ? 100 : pct}
          color={status === 'ready' ? '#1D9E75' : pct > 65 ? SIGNAL_CORAL : pct > 32 ? '#f59e0b' : ROUTE_BLUE}
        />
      )}

      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '14px', color: statusColor, lineHeight: '1.6',
          fontWeight: status === 'ready' ? WEIGHT.black : WEIGHT.semiBold,
          textTransform: status === 'ready' ? 'uppercase' : 'none',
          letterSpacing: status === 'ready' ? '.06em' : 'normal',
          margin: showBtn ? '0 0 12px' : 0 }}>
          {statusMsg}
        </p>
        {showBtn && (
          <button onClick={startWatch} style={{
            background: ROUTE_BLUE, color: '#fff', border: 'none',
            borderRadius: '100px', padding: '10px 20px',
            fontSize: '13px', fontWeight: WEIGHT.semiBold,
            letterSpacing: '.06em', textTransform: 'uppercase', cursor: 'pointer'
          }}>
            {btnLabel}
          </button>
        )}
      </div>
    </div>
  )
}