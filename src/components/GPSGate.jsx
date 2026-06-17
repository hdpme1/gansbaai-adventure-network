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

  // Auto-request GPS when component mounts with autoRequest=true
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
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const config = {
    idle:    { msg: 'We need to verify you are at this location before revealing the puzzle.', btn: 'Verify my location', color: '#888' },
    locating:{ msg: 'Getting your location...', color: '#888' },
    ready:   { msg: 'Location verified — answer the puzzle below.', color: '#86efac' },
    denied:  { msg: 'Location access denied. Enable GPS in your browser settings to continue.', color: '#fca5a5' },
    far:     { msg: 'You are ' + distance + 'm away. You need to be within ' + checkpoint.gps_radius_meters + 'm — get closer!',
               btn: 'Try again', color: '#fbbf24' },
  }

  const c = config[status]

  return (
    <div style={{ marginBottom:'20px', padding:'14px', background:'#111',
      borderRadius:'8px', border:'1px solid #1f1f1f' }}>
      <p style={{ fontSize:'13px', color: c.color, lineHeight:'1.6',
        marginBottom: c.btn ? '10px' : '0' }}>
        {c.msg}
      </p>
      {c.btn && (
        <button onClick={requestGPS}
          style={{ background:'transparent', border:'1px solid #333',
            color:'#fff', padding:'8px 16px', borderRadius:'6px', fontSize:'13px' }}>
          {c.btn}
        </button>
      )}
    </div>
  )
}