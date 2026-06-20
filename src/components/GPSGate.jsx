import { useState, useEffect } from 'react'

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const rad = n => n * Math.PI / 180
  const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1)
  const a = Math.sin(dLat/2)**2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function GPSGate({ checkpoint, onReady, autoRequest = false }) {
  const [status, setStatus]     = useState('idle')
  const [distance, setDistance] = useState(null)

  useEffect(() => {
    if (autoRequest && status === 'idle') {
      requestGPS()
    }
  }, [autoRequest])

  function requestGPS() {
    setStatus('locating')
    if (!navigator.geolocation) { setStatus('denied'); return }

    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        const dist = Math.round(
          haversine(latitude, longitude, Number(checkpoint.gps_lat), Number(checkpoint.gps_lng))
        )
        setDistance(dist)

        if (dist <= checkpoint.gps_radius_meters) {
          setStatus('ready')
          onReady({ lat: latitude, lng: longitude })
        } else {
          setStatus('far')
        }
      },
      () => setStatus('denied'),
      { 
        enableHighAccuracy: true, 
        timeout: 12000, 
        maximumAge: 0 // Crucial for Android: forces immediate hardware update bypass
      }
    )
  }

  let farMessage = `You are ${distance}m away. You need to be within ${checkpoint.gps_radius_meters}m — get closer!`
  let farColor = '#fbbf24'

  if (distance !== null) {
    const coldThreshold = checkpoint.gps_radius_meters * 5
    const warmThreshold = checkpoint.gps_radius_meters * 2
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
    denied:  { msg: 'Location access denied. Enable GPS in your browser settings to continue.', color: '#fca5a5' },
    far:     { msg: farMessage, btn: 'Scan position again', color: farColor },
  }

  const c = config[status]

  return (
    <div style={{ marginBottom:'24px', padding:'16px', background:'#111',
      borderRadius:'12px', border:`1px solid ${status === 'far' ? c.color : '#1f1f1f'}`,
      transition: 'border-color 0.3s ease' }}>
      <p style={{ fontSize:'14px', color: c.color, lineHeight:'1.6', fontWeight: '500',
        margin: '0 0 ' + (c.btn ? '12px' : '0') }}>
        {c.msg}
      </p>
      {c.btn && (
        <button onClick={requestGPS} style={{
          background: status === 'far' ? c.color : '#fff',
          color: '#000', border:'none', borderRadius:'8px', padding:'10px 16px',
          fontSize:'13px', fontWeight:'600', cursor:'pointer'
        }}>
          {c.btn}
        </button>
      )}
    </div>
  )
}