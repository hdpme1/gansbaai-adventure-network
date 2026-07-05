import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPlayerCollection } from '../lib/api'
import {
  L, D, NIGHT_INK, ROUTE_BLUE, UNLOCK_LIME, SIGNAL_CORAL, WEIGHT
} from '../lib/theme'

// model-viewer is a Google web component — loaded via CDN script tag in index.html.
// It handles GLB rendering, touch/mouse spin controls, and AR on both iOS and Android.
// No install needed — just use <model-viewer> as a JSX element.

const RARITY_COLOUR = {
  common:    '#8A8A9A',
  rare:      ROUTE_BLUE,
  legendary: UNLOCK_LIME,
}

const pill = (custom = {}) => ({
  width: '100%', padding: '16px 24px', borderRadius: '100px',
  fontSize: '15px', fontWeight: WEIGHT.semiBold, letterSpacing: '.06em',
  textTransform: 'uppercase', cursor: 'pointer', border: 'none',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  ...custom
})

// ── 3D Viewer modal ──────────────────────────────────────────────────────────
function ModelModal({ collectable, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 1000,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '24px',
    }}>
      <button onClick={e => { e.stopPropagation(); onClose() }} style={{
        position: 'absolute', top: '20px', right: '20px',
        width: '40px', height: '40px', borderRadius: '50%',
        background: D.surface, border: `1px solid ${D.border}`,
        color: '#fff', fontSize: '18px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>✕</button>

      <div onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '480px', textAlign: 'center' }}>

        <p style={{ fontSize: '11px', fontWeight: WEIGHT.semiBold,
          color: RARITY_COLOUR[collectable.rarity] || UNLOCK_LIME,
          letterSpacing: '.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>
          {collectable.rarity} · {collectable.adventure?.name}
        </p>

        {/* model-viewer web component — Google's GLB renderer with AR built in */}
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
            height: '340px',
            borderRadius: '16px',
            background: D.surface,
            '--poster-color': NIGHT_INK,
          }}
        />

        <h3 style={{ fontSize: '22px', fontWeight: WEIGHT.black,
          textTransform: 'uppercase', color: '#fff',
          margin: '16px 0 6px', letterSpacing: '-.01em' }}>
          {collectable.name}
        </h3>

        {collectable.description && (
          <p style={{ fontSize: '14px', color: D.muted, lineHeight: '1.6',
            margin: '0 0 20px' }}>
            {collectable.description}
          </p>
        )}

        <p style={{ fontSize: '12px', color: D.faint, margin: '0 0 20px' }}>
          Collected from {collectable.adventure?.name}
          {collectable.checkpoint_sequence ? ` · Spot ${collectable.checkpoint_sequence}` : ''}
        </p>

        <button onClick={onClose} style={pill({ background: ROUTE_BLUE, color: '#fff' })}>
          Close
        </button>
      </div>
    </div>
  )
}

// ── Collectable card ─────────────────────────────────────────────────────────
function CollectableCard({ item, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: D.surface, border: `1.5px solid ${D.border}`,
      borderRadius: '14px', padding: '16px', textAlign: 'center',
      cursor: 'pointer', color: '#fff', transition: 'border-color 0.2s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = RARITY_COLOUR[item.rarity] || D.borderMid}
    onMouseLeave={e => e.currentTarget.style.borderColor = D.border}>

      {/* Thumbnail or placeholder */}
      <div style={{ width: '100%', aspectRatio: '1', borderRadius: '10px',
        overflow: 'hidden', marginBottom: '10px', background: D.surfaceAlt,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {item.thumbnail_url
          ? <img src={item.thumbnail_url} alt={item.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: '32px' }}>🎁</span>
        }
      </div>

      {/* Rarity badge */}
      <span style={{ display: 'block', fontSize: '9px', fontWeight: WEIGHT.semiBold,
        color: RARITY_COLOUR[item.rarity] || D.muted,
        letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
        {item.rarity}
      </span>

      <p style={{ fontSize: '13px', fontWeight: WEIGHT.semiBold,
        margin: '0 0 4px', lineHeight: '1.3' }}>
        {item.name}
      </p>

      <p style={{ fontSize: '11px', color: D.muted, margin: 0 }}>
        {item.adventure?.name}
      </p>
    </button>
  )
}

// ── Main collection page ─────────────────────────────────────────────────────
export default function CollectionPage() {
  const navigate = useNavigate()

  const [phone,       setPhone]       = useState('')
  const [collection,  setCollection]  = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [selected,    setSelected]    = useState(null)   // collectable being viewed

  async function handleLookup() {
    if (!phone.trim()) return
    setLoading(true)
    setError('')
    try {
      const data = await getPlayerCollection(phone.trim())
      if (data.error) {
        setError(data.message || 'Could not find your collection.')
      } else {
        setCollection(data)
      }
    } catch {
      setError('Connection issue — check your signal and try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Phone lookup screen ──
  if (!collection) return (
    <div style={{ minHeight: '100vh', background: NIGHT_INK, color: '#fff',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '32px' }}>

      <div style={{ width: '100%', maxWidth: '380px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗃️</div>
        <h1 className="font-display" style={{ fontSize: '36px', color: UNLOCK_LIME,
          margin: '0 0 8px' }}>
          YOUR CASE.
        </h1>
        <p style={{ fontSize: '15px', color: D.muted, margin: '0 0 32px',
          lineHeight: '1.6' }}>
          Enter the phone number you used to register — we'll pull up everything you've collected.
        </p>

        <label style={{ display: 'block', fontSize: '11px', fontWeight: WEIGHT.semiBold,
          color: D.muted, letterSpacing: '.08em', textTransform: 'uppercase',
          marginBottom: '8px', textAlign: 'left' }}>
          Phone Number
        </label>
        <input
          type="tel"
          placeholder="083 123 4567"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLookup()}
          style={{ width: '100%', background: D.surface, border: `1.5px solid ${D.border}`,
            borderRadius: '12px', padding: '16px', color: '#fff', fontSize: '18px',
            fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
            marginBottom: '12px', outline: 'none', textAlign: 'center',
            letterSpacing: '.05em' }}
        />

        {error && (
          <p style={{ color: SIGNAL_CORAL, fontSize: '14px',
            marginBottom: '12px', lineHeight: '1.5' }}>{error}</p>
        )}

        <button onClick={handleLookup} disabled={!phone.trim() || loading}
          style={pill({ background: ROUTE_BLUE, color: '#fff' })}>
          {loading ? 'Searching...' : 'Open Display Case'}
        </button>

        <button onClick={() => navigate('/')}
          style={pill({ background: 'transparent', color: D.muted,
            border: `1.5px solid ${D.border}`, marginTop: '12px' })}>
          Back to PLAYCE
        </button>
      </div>
    </div>
  )

  // ── Collection display ──
  const { player, collectables, total } = collection

  return (
    <div style={{ minHeight: '100vh', background: NIGHT_INK, color: '#fff',
      padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <button onClick={() => navigate('/')} style={{
          background: 'none', border: `1px solid ${D.border}`, color: D.muted,
          padding: '7px 16px', borderRadius: '100px', fontSize: '12px',
          fontWeight: WEIGHT.semiBold, letterSpacing: '.06em', textTransform: 'uppercase',
          cursor: 'pointer', marginBottom: '24px'
        }}>
          ← PLAYCE
        </button>

        <p style={{ fontSize: '11px', fontWeight: WEIGHT.semiBold, color: ROUTE_BLUE,
          letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>
          Display Case
        </p>
        <h1 className="font-display" style={{ fontSize: '32px', color: '#fff',
          margin: '0 0 4px' }}>
          {player.display_name || 'Explorer'}
        </h1>
        <p style={{ fontSize: '14px', color: D.muted, margin: 0 }}>
          {total === 0
            ? 'No collectables yet — go solve some spots.'
            : `${total} collectable${total === 1 ? '' : 's'} found`
          }
        </p>
      </div>

      {/* Empty state */}
      {total === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px',
          background: D.surface, borderRadius: '16px',
          border: `1.5px solid ${D.border}` }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
          <h3 style={{ fontSize: '18px', fontWeight: WEIGHT.black,
            textTransform: 'uppercase', margin: '0 0 8px' }}>
            Nothing here yet.
          </h3>
          <p style={{ fontSize: '14px', color: D.muted, lineHeight: '1.6', margin: 0 }}>
            Collectables are hidden at certain Spots across PLAYCE chases.
            Solve them to find out which ones have something waiting.
          </p>
        </div>
      )}

      {/* Grid */}
      {total > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px' }}>
          {collectables.map(item => (
            <CollectableCard
              key={item.id}
              item={item}
              onClick={() => setSelected(item)}
            />
          ))}
        </div>
      )}

      {/* 3D viewer modal */}
      {selected && (
        <ModelModal
          collectable={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}