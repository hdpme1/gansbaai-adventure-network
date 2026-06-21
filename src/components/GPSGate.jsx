import { useState, useEffect, useRef } from 'react'

const SAMPLE_WINDOW = 5 // rolling buffer size for median smoothing

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const rad = n => n * Math.PI / 180
  const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1)
  const a = Math.sin(dLat/2)**2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// Circular proximity gauge — fills as the player gets closer. Not a
// directional radar (no compass data available), just a visual read of
// "how close," colored to match the existing hot/warm/cold messaging.
function ProximityRing({ pct, color }) {
  const size = 96
  const strokeWidth = 8
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - Math.max(0, Math.min(100, pct)) / 100)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="#222" strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s ease' }}
      />
    </svg>
  )
}

export default function GPSGate({ checkpoint, onReady, autoRequest = false }) {
  const [status, setStatus]     = useState('idle')
  const [distance, setDistance] = useState(null)

  const watchIdRef    = useRef(null)
  const samplesRef     = useRef([])
  const readyFiredRef  = useRef(false)

  function stopWatch() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }

  function startWatch() {
    if (!navigator.geolocation) { setStatus('denied'); return }
    stopWatch()
    samplesRef.current = []
    readyFiredRef.current = false
    setStatus('locating')

    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords: { latitude, longitude } }) => {
        const raw = haversine(latitude, longitude, Number(checkpoint.gps_lat), Number(checkpoint.gps_lng))

        // Rolling median over the last few fixes — smooths out the
        // occasional bad reading instead of reacting to every jitter.
        samplesRef.current = [...samplesRef.current, raw].slice(-SAMPLE_WINDOW)
        const smoothed = Math.round(median(samplesRef.current))
        setDistance(smoothed)

        if (smoothed <= checkpoint.gps_radius_meters) {
          setStatus('ready')
          if (!readyFiredRef.current) {
            readyFiredRef.current = true
            onReady({ lat: latitude, lng: longitude })
          }
          stopWatch() // verified — stop polling, no need to keep draining battery
        } else {
          setStatus('far')
        }
      },
      () => setStatus('denied'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    )
  }

  // Re-arm fresh tracking whenever the checkpoint changes. GPSGate is the
  // same component instance across checkpoint navigation (CheckpointPage
  // doesn't remount it on slug change), so without this, a "verified"
  // status from the PREVIOUS checkpoint would linger on the new one.
  useEffect(() => {
    stopWatch()
    samplesRef.current = []
    readyFiredRef.current = false
    setStatus('idle')
    setDistance(null)

    if (autoRequest) startWatch()

    return () => stopWatch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkpoint.id])

  const coldThreshold = checkpoint.gps_radius_meters * 5
  const warmThreshold = checkpoint.gps_radius_meters * 2

  let farMessage = distance !== null
    ? `You are ${distance}m away. You need to be within ${checkpoint.gps_radius_meters}m — get closer!`
    : ''
  let farColor = '#fbbf24'
  let proximityPct = 0

  if (distance !== null) {
    proximityPct = Math.max(0, Math.min(100, (1 - distance / coldThreshold) * 100))

    if (distance > coldThreshold) {
      farMessage = `❄️ Status: Cold (${distance}m away). Look closely at your location context clues!`
      farColor = '#60a5fa'
    } else if (distance > warmThreshold) {
      farMessage = `🌤️ Status: Warm (${distance}m away). You're heading the right way!`
      farColor = '#f59e0b'
    } else {
      farMessage = `🔥 Getting hot! Only ${distance}m away. Look closely around you.`
      farColor = '#ef4444'
    }
  }

  const config = {
    idle:    { msg: 'We need to verify you are at this location before revealing the puzzle.', btn: 'Verify my location', color: '#888' },
    locating:{ msg: '📡 Getting your location...', color: '#888' },
    ready:   { msg: '✓ Location verified — answer the puzzle below.', color: '#1D9E75' },
    denied:  { msg: 'Location access denied. Enable GPS in your browser settings, then try again.', btn: 'Try again', color: '#fca5a5' },
    far:     { msg: farMessage, btn: 'Scan position again', color: farColor },
  }

  const c = config[status]
  const showRing = (status === 'far' || status === 'ready') && distance !== null

  return (
    <div style={{ marginBottom:'24px', padding:'16px', background:'#111',
      borderRadius:'12px', border:`1px solid ${status === 'far' ? c.color : '#1f1f1f'}`,
      transition: 'border-color 0.3s ease', display: 'flex', alignItems: 'center', gap: '16px' }}>

      {showRing && <ProximityRing pct={status === 'ready' ? 100 : proximityPct} color={c.color} />}

      <div style={{ flex: 1 }}>
        <p style={{ fontSize:'14px', color: c.color, lineHeight:'1.6', fontWeight: '500',
          margin: '0 0 ' + (c.btn ? '12px' : '0') }}>
          {c.msg}
        </p>
        {c.btn && (
          <button onClick={startWatch} style={{
            background: status === 'far' ? c.color : '#fff',
            color: '#000', border:'none', borderRadius:'8px', padding:'10px 16px',
            fontSize:'13px', fontWeight:'600', cursor:'pointer'
          }}>
            {c.btn}
          </button>
        )}
      </div>
    </div>
  )
}