import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAdminStats, listAdventures } from '../lib/api'
import { D, NIGHT_INK, ROUTE_BLUE, UNLOCK_LIME, SIGNAL_CORAL, WEIGHT } from '../lib/theme'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-ZA',
    { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const card = (value, label, color) => (
  <div style={{ background: D.surface, border: `1px solid ${D.border}`,
    borderRadius: '10px', padding: '14px 16px' }}>
    <p style={{ fontSize: '26px', fontWeight: WEIGHT.black, margin: '0 0 4px', color }}>{value}</p>
    <p style={{ fontSize: '12px', color: D.muted, margin: 0 }}>{label}</p>
  </div>
)

export default function AdminPage() {
  const [password,     setPassword]     = useState('')
  const [stats,        setStats]        = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [adventureSlug, setAdventureSlug] = useState('')
  const [adventures,   setAdventures]   = useState([])

  async function login() {
    setLoading(true); setError('')
    const [adventureList, firstStats] = await Promise.all([
      listAdventures(),
      getAdminStats(password, adventureSlug || 'lost-shark-logbook'),
    ])
    if (firstStats.error === 'Unauthorized') {
      setError('Incorrect password'); setLoading(false); return
    }
    if (firstStats.error) { setError(firstStats.error); setLoading(false); return }
    const list = adventureList.adventures || []
    setAdventures(list)
    const defaultSlug = list[0]?.slug || 'lost-shark-logbook'
    setAdventureSlug(defaultSlug)
    if (defaultSlug !== (adventureSlug || 'lost-shark-logbook')) {
      const data = await getAdminStats(password, defaultSlug)
      if (!data.error) setStats(data)
    } else {
      setStats(firstStats)
    }
    setLoading(false)
  }

  async function refresh() {
    setLoading(true)
    const data = await getAdminStats(password, adventureSlug)
    if (!data.error) setStats(data)
    setLoading(false)
  }

  useEffect(() => { if (stats) refresh() }, [adventureSlug])

  if (!stats) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px', background: NIGHT_INK, color: '#fff' }}>
      <div style={{ width: '100%', maxWidth: '300px' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚡</div>
        <p style={{ fontSize: '11px', fontWeight: WEIGHT.semiBold, color: D.muted,
          letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>PLAYCE</p>
        <h1 style={{ fontSize: '20px', fontWeight: WEIGHT.black, textTransform: 'uppercase',
          margin: '0 0 24px' }}>Game Master</h1>
        <input type="password" value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          placeholder="Password"
          style={{ width: '100%', background: D.surface, border: `1px solid ${D.border}`,
            borderRadius: '8px', padding: '13px', color: '#fff', fontSize: '15px',
            marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
        {error && <p style={{ color: SIGNAL_CORAL, fontSize: '13px', marginBottom: '10px' }}>{error}</p>}
        <button onClick={login} style={{ width: '100%', background: ROUTE_BLUE, color: '#fff',
          border: 'none', padding: '13px', borderRadius: '100px', fontSize: '14px',
          fontWeight: WEIGHT.semiBold, letterSpacing: '.06em', textTransform: 'uppercase' }}>
          {loading ? 'Loading...' : 'Enter'}
        </button>
      </div>
    </div>
  )

  const maxFunnel = Math.max(...(stats.dropoff?.map(d => d.count) || [1]), 1)

  return (
    <div style={{ minHeight: '100vh', padding: '24px', maxWidth: '580px',
      margin: '0 auto', background: NIGHT_INK, color: '#fff' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: WEIGHT.semiBold, color: D.muted,
            letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 6px' }}>
            Game Master
          </p>
          <select value={adventureSlug} onChange={e => setAdventureSlug(e.target.value)}
            style={{ background: D.surface, color: '#fff', border: `1px solid ${D.border}`,
              borderRadius: '6px', padding: '8px 10px', fontSize: '14px',
              fontWeight: WEIGHT.semiBold, fontFamily: 'Inter, sans-serif' }}>
            {adventures.map(a => <option key={a.slug} value={a.slug}>{a.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to="/admin/edit-adventure" style={{ background: D.surface,
            border: `1px solid ${D.border}`, color: D.muted, padding: '7px 14px',
            borderRadius: '100px', fontSize: '12px', fontWeight: WEIGHT.semiBold,
            textDecoration: 'none', letterSpacing: '.04em', textTransform: 'uppercase' }}>
            Edit
          </Link>
          <Link to="/admin/new-adventure" style={{ background: ROUTE_BLUE, border: 'none',
            color: '#fff', padding: '7px 14px', borderRadius: '100px', fontSize: '12px',
            fontWeight: WEIGHT.semiBold, textDecoration: 'none',
            letterSpacing: '.04em', textTransform: 'uppercase' }}>
            + New Chase
          </Link>
          <button onClick={refresh} style={{ background: 'none', border: `1px solid ${D.border}`,
            color: D.muted, padding: '7px 14px', borderRadius: '100px', fontSize: '12px',
            cursor: 'pointer' }}>
            {loading ? '...' : '↻'}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '10px', marginBottom: '10px' }}>
        {card(stats.active,         'Active right now',  ROUTE_BLUE)}
        {card(stats.today_complete, 'Completions today', '#1D9E75')}
        {card(stats.total_complete, 'Total completions', UNLOCK_LIME)}
        {card(stats.total_sessions, 'Total registered',  D.muted)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '10px', marginBottom: '24px' }}>
        {card(stats.completion_rate + '%', 'Completion rate', '#1D9E75')}
        {card(`${stats.redemptions ?? 0} / ${stats.total_rewards ?? 0}`, 'Rewards redeemed', ROUTE_BLUE)}
      </div>

      {/* Spot funnel */}
      <p style={{ fontSize: '11px', fontWeight: WEIGHT.semiBold, color: D.muted,
        letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>
        Spot Funnel
      </p>
      <div style={{ background: D.surface, border: `1px solid ${D.border}`,
        borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
        {stats.dropoff?.map(d => (
          <div key={d.sequence} style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: D.muted }}>Spot {d.sequence}</span>
              <span style={{ fontSize: '12px', color: '#fff' }}>{d.count} solved</span>
            </div>
            <div style={{ background: D.surfaceAlt, borderRadius: '4px',
              height: '6px', overflow: 'hidden' }}>
              <div style={{ background: ROUTE_BLUE, height: '6px', transition: 'width .4s',
                width: (d.count / maxFunnel * 100) + '%' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Most struggled */}
      {stats.most_failed && (
        <div style={{ background: '#2D1215', border: `1px solid #5C2028`,
          borderRadius: '10px', padding: '12px 16px', marginBottom: '24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: WEIGHT.semiBold, color: SIGNAL_CORAL,
              letterSpacing: '.06em', textTransform: 'uppercase', margin: '0 0 2px' }}>
              Most Struggled
            </p>
            <p style={{ fontSize: '13px', color: '#fff', margin: 0 }}>
              Spot {stats.most_failed.sequence} ({stats.most_failed.slug})
            </p>
          </div>
          <span style={{ fontSize: '13px', color: SIGNAL_CORAL, fontWeight: WEIGHT.semiBold }}>
            {stats.most_failed.failed_attempts} wrong attempts
          </span>
        </div>
      )}

      {/* Recent completions */}
      <p style={{ fontSize: '11px', fontWeight: WEIGHT.semiBold, color: D.muted,
        letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>
        Recent Town Cracks
      </p>
      <div style={{ background: D.surface, border: `1px solid ${D.border}`,
        borderRadius: '10px', overflow: 'hidden' }}>
        {stats.recent?.length === 0 && (
          <p style={{ color: D.faint, fontSize: '13px', padding: '16px', margin: 0 }}>
            No completions yet
          </p>
        )}
        {stats.recent?.map((r, i) => (
          <div key={i} style={{ padding: '11px 16px',
            borderBottom: i < stats.recent.length - 1 ? `1px solid ${D.border}` : 'none',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: WEIGHT.semiBold,
                margin: '0 0 2px' }}>{r.player_name}</p>
              <p style={{ fontSize: '11px', color: D.muted, margin: 0 }}>
                {formatDate(r.completed_at)}
              </p>
            </div>
            <span style={{ fontSize: '13px', color: UNLOCK_LIME, fontWeight: WEIGHT.semiBold }}>
              {r.total_points} pts
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}