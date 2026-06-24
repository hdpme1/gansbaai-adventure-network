import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAdminStats, listAdventures } from '../lib/api'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-ZA',
    { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [stats, setStats]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const [adventureSlug, setAdventureSlug] = useState('')
  const [adventures, setAdventures] = useState([])

  async function login() {
    setLoading(true); setError('')

    // Load the adventure list and the first adventure's stats in parallel —
    // no point making the admin wait for two sequential round-trips.
    const [adventureList, firstStats] = await Promise.all([
      listAdventures(),
      getAdminStats(password, adventureSlug || 'lost-shark-logbook'),
    ])

    if (firstStats.error === 'Unauthorized') {
      setError('Incorrect password'); setLoading(false); return
    }
    if (firstStats.error) {
      setError(firstStats.error); setLoading(false); return
    }

    const list = adventureList.adventures || []
    setAdventures(list)

    // Default to whichever adventure comes first from the API (ordered by
    // created_at asc), rather than a hardcoded slug that could stop matching
    // as new adventures are added.
    const defaultSlug = list[0]?.slug || 'lost-shark-logbook'
    setAdventureSlug(defaultSlug)

    // If the default slug differs from what we fetched stats for, refetch —
    // otherwise use what we already have.
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
  useEffect(() => {
  if (stats) refresh()
}, [adventureSlug])

  const card = (value, label, color) => (
    <div style={{ background:'#111', border:'1px solid #1f1f1f',
      borderRadius:'10px', padding:'14px 16px' }}>
      <p style={{ fontSize:'26px', fontWeight:'500', margin:'0 0 4px', color }}>{value}</p>
      <p style={{ fontSize:'12px', color:'#666', margin:0 }}>{label}</p>
    </div>
  )

  if (!stats) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center',
      justifyContent:'center', padding:'24px' }}>
      <div style={{ width:'100%', maxWidth:'300px' }}>
        <p style={{ fontSize:'12px', color:'#555', margin:'0 0 4px' }}>Gansbaai Adventure Network</p>
        <h1 style={{ fontSize:'20px', fontWeight:'500', margin:'0 0 24px' }}>Game Master</h1>
        <input type="password" value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          placeholder="Password"
          style={{ width:'100%', background:'#111', border:'1px solid #2a2a2a',
            borderRadius:'8px', padding:'13px', color:'#fff', fontSize:'15px',
            marginBottom:'10px', boxSizing:'border-box' }} />
        {error && <p style={{ color:'#f87171', fontSize:'13px', marginBottom:'10px' }}>{error}</p>}
        <button onClick={login} style={{ width:'100%', background:'#fff', color:'#000',
          border:'none', padding:'13px', borderRadius:'8px', fontSize:'15px', fontWeight:'500' }}>
          {loading ? 'Loading...' : 'Enter'}
        </button>
      </div>
    </div>
  )

  const maxFunnel = Math.max(...(stats.dropoff?.map(d => d.count) || [1]), 1)

  return (
    <div style={{ minHeight:'100vh', padding:'24px', maxWidth:'580px', margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px' }}>
        <div>
          <p style={{ fontSize:'12px', color:'#555', margin:'0 0 2px' }}>Game Master Dashboard</p>
         <select
  value={adventureSlug}
  onChange={e => setAdventureSlug(e.target.value)}
  style={{
    background:'#111',
    color:'#fff',
    border:'1px solid #2a2a2a',
    borderRadius:'6px',
    padding:'8px 10px',
    fontSize:'14px'
  }}
>
  {adventures.map(adv => (
    <option key={adv.slug} value={adv.slug}>{adv.name}</option>
  ))}
</select>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <Link to="/admin/edit-adventure" style={{ background: T.surface || '#111', border:'1px solid #333',
            color:'#fff', padding:'7px 14px', borderRadius:'6px', fontSize:'12px',
            fontWeight:'500', textDecoration:'none' }}>
            ✏️ Edit adventure
          </Link>
          <Link to="/admin/new-adventure" style={{ background:'#fff', border:'1px solid #fff',
            color:'#000', padding:'7px 14px', borderRadius:'6px', fontSize:'12px',
            fontWeight:'500', textDecoration:'none' }}>
            + New adventure
          </Link>
          <button onClick={refresh} style={{ background:'none', border:'1px solid #222',
          color:'#888', padding:'7px 14px', borderRadius:'6px', fontSize:'12px', cursor:'pointer' }}>
          {loading ? '...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'10px', marginBottom:'10px' }}>
        {card(stats.active,         'Active right now',  '#378ADD')}
        {card(stats.today_complete, 'Completions today', '#1D9E75')}
        {card(stats.total_complete, 'Total completions', '#C8953A')}
        {card(stats.total_sessions, 'Total registered',  '#888')}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'10px', marginBottom:'24px' }}>
        {card(stats.completion_rate + '%', 'Completion rate', '#1D9E75')}
        {card(`${stats.redemptions ?? 0} / ${stats.total_rewards ?? 0}`, 'Rewards redeemed', '#C8953A')}
      </div>

      <p style={{ fontSize:'11px', fontWeight:'500', color:'#555', letterSpacing:'.06em',
        textTransform:'uppercase', margin:'0 0 10px' }}>Checkpoint funnel</p>
      <div style={{ background:'#111', border:'1px solid #1f1f1f', borderRadius:'10px',
        padding:'16px', marginBottom:'12px' }}>
        {stats.dropoff?.map(d => (
          <div key={d.sequence} style={{ marginBottom:'10px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
              <span style={{ fontSize:'12px', color:'#888' }}>Checkpoint {d.sequence}</span>
              <span style={{ fontSize:'12px', color:'#fff' }}>{d.count} solved</span>
            </div>
            <div style={{ background:'#1a1a1a', borderRadius:'4px', height:'6px', overflow:'hidden' }}>
              <div style={{ background:'#1D9E75', height:'6px',
                width: (d.count / maxFunnel * 100) + '%', transition:'width .4s' }} />
            </div>
          </div>
        ))}
      </div>

      {stats.most_failed && (
        <div style={{ background:'#2d1212', border:'1px solid #991b1b', borderRadius:'10px',
          padding:'12px 16px', marginBottom:'24px', display:'flex',
          justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <p style={{ fontSize:'11px', fontWeight:'600', color:'#fca5a5', letterSpacing:'.06em',
              textTransform:'uppercase', margin:'0 0 2px' }}>Most struggled with</p>
            <p style={{ fontSize:'13px', color:'#fff', margin:0 }}>
              Checkpoint {stats.most_failed.sequence} ({stats.most_failed.slug})
            </p>
          </div>
          <span style={{ fontSize:'13px', color:'#fca5a5', fontWeight:'500' }}>
            {stats.most_failed.failed_attempts} wrong attempts
          </span>
        </div>
      )}

      <p style={{ fontSize:'11px', fontWeight:'500', color:'#555', letterSpacing:'.06em',
        textTransform:'uppercase', margin:'0 0 10px' }}>Recent completions</p>
      <div style={{ background:'#111', border:'1px solid #1f1f1f', borderRadius:'10px', overflow:'hidden' }}>
        {stats.recent?.length === 0 && (
          <p style={{ color:'#444', fontSize:'13px', padding:'16px', margin:0 }}>No completions yet</p>
        )}
        {stats.recent?.map((r, i) => (
          <div key={i} style={{ padding:'11px 16px',
            borderBottom: i < stats.recent.length - 1 ? '1px solid #1a1a1a' : 'none',
            display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <p style={{ fontSize:'13px', fontWeight:'500', margin:'0 0 2px' }}>{r.player_name}</p>
              <p style={{ fontSize:'11px', color:'#555', margin:0 }}>{formatDate(r.completed_at)}</p>
            </div>
            <span style={{ fontSize:'13px', color:'#C8953A', fontWeight:'500' }}>
              {r.total_points} pts
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}