import { useState, useEffect, useCallback } from 'react'
import { D, NIGHT_INK, ROUTE_BLUE, UNLOCK_LIME, SIGNAL_CORAL, WEIGHT } from '../lib/theme'
import { useNavigate } from 'react-router-dom'
import { listAdventures, getAdventureFull, updateAdventure } from '../lib/api'

// ─── Theme (matches AdminNewAdventurePage) ───────────────────────────────────
const T = {
  bg:            NIGHT_INK,
  surface:       D.surface,
  surfaceAlt:    D.surfaceAlt,
  border:        D.border,
  borderMid:     D.borderMid,
  text:          '#ffffff',
  muted:         D.muted,
  faint:         D.faint,
  accent:        ROUTE_BLUE,
  success:       '#1D9E75',
  successBg:     D.successBg,
  successBorder: D.successBorder,
  successText:   UNLOCK_LIME,
  errorBg:       D.errorBg,
  errorBorder:   D.errorBorder,
  errorText:     SIGNAL_CORAL,
}

const label    = { fontSize: '12px', fontWeight: '600', color: D.muted, marginBottom: '6px', display: 'block' }
const inputStyle = { width: '100%', background: D.surfaceAlt, border: `1px solid ${D.borderMid}`,
  borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '14px',
  boxSizing: 'border-box', marginBottom: '4px' }
const textarea = { ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: '1.5' }

// ─── SaveButton — inline per-section save with loading/success/error state ──
function SaveButton({ onSave }) {
  const [state, setState] = useState('idle') // idle | saving | saved | error
  const [errMsg, setErrMsg] = useState('')

  async function handle() {
    setState('saving')
    setErrMsg('')
    try {
      const err = await onSave()
      if (err) { setState('error'); setErrMsg(err); return }
      setState('saved')
      setTimeout(() => setState('idle'), 2500)
    } catch (e) {
      setState('error')
      setErrMsg(e.message || 'Save failed')
    }
  }

  return (
    <div>
      <button onClick={handle} disabled={state === 'saving'} style={{
        background: state === 'saved' ? T.successBg : ROUTE_BLUE,
        border: state === 'saved' ? `1px solid ${T.successBorder}` : 'none',
        color: state === 'saved' ? T.successText : '#000',
        borderRadius: '8px', padding: '9px 20px', fontSize: '13px',
        fontWeight: '600', cursor: 'pointer', opacity: state === 'saving' ? 0.6 : 1
      }}>
        {state === 'saving' ? 'Saving...' : state === 'saved' ? '✓ Saved' : 'Save changes'}
      </button>
      {state === 'error' && (
        <p style={{ fontSize: '12px', color: SIGNAL_CORAL, marginTop: '6px' }}>{errMsg}</p>
      )}
    </div>
  )
}

// ─── Section wrapper — collapsible block with a title ───────────────────────
function Section({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ border: `1px solid ${D.border}`, borderRadius: '10px',
      marginBottom: '12px', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '14px 16px', background: D.surface,
        border: 'none', color: '#fff', fontSize: '14px', fontWeight: '600',
        cursor: 'pointer', textAlign: 'left'
      }}>
        {title}
        <span style={{ color: D.muted, fontSize: '18px', lineHeight: 1 }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{ padding: '16px', background: NIGHT_INK, borderTop: `1px solid ${D.border}` }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Field helper ────────────────────────────────────────────────────────────
function Field({ label: lbl, children }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <span style={label}>{lbl}</span>
      {children}
    </div>
  )
}

export default function AdminEditAdventurePage() {
  const navigate = useNavigate()
  const [password, setPassword]     = useState('')
  const [authed, setAuthed]         = useState(false)
  const [authError, setAuthError]   = useState('')
  const [adventures, setAdventures] = useState([])
  const [selectedSlug, setSelectedSlug] = useState('')
  const [data, setData]             = useState(null) // { adventure, checkpoints, artifacts }
  const [loading, setLoading]       = useState(false)
  const [loadError, setLoadError]   = useState('')

  // Local edit state — keyed so we can track per-section changes
  const [adv, setAdv]               = useState(null)
  const [cps, setCps]               = useState([])    // checkpoints
  const [arts, setArts]             = useState([])    // artifacts
  const [cpIndex, setCpIndex]       = useState(0)

  // ── Auth ──
  async function handleLogin() {
    setAuthError('')
    setLoading(true)
    const list = await listAdventures()
    if (list.error) { setAuthError('Failed to load adventures — check password'); setLoading(false); return }
    setAdventures(list.adventures || [])
    setSelectedSlug(list.adventures?.[0]?.slug || '')
    setAuthed(true)
    setLoading(false)
  }

  // ── Load full adventure data ──
  async function loadAdventure(slug) {
    if (!slug) return
    setLoading(true)
    setLoadError('')
    setData(null)
    const res = await getAdventureFull(password, slug)
    setLoading(false)
    if (res.error) { setLoadError(res.error); return }
    setData(res)
    setAdv({ ...res.adventure })
    setCps(res.checkpoints.map(cp => ({ ...cp })))
    setArts(res.artifacts.map(a => ({ ...a })))
    setCpIndex(0)
  }

  useEffect(() => {
    if (authed && selectedSlug) loadAdventure(selectedSlug)
  }, [selectedSlug])

  // ── Save helpers — each returns an error string or undefined ──
  const saveAdventure = useCallback(async () => {
    const res = await updateAdventure(password, 'adventure', adv.id, {
      name:              adv.name,
      icon:              adv.icon,
      story_intro:       adv.story_intro,
      story_outro:       adv.story_outro,
      ambient_audio_url: adv.ambient_audio_url,
      is_active:         adv.is_active,
    })
    if (!res.success) return res.error || 'Save failed'
  }, [adv, password])

  const saveCheckpoint = useCallback(async (cp) => {
    const res = await updateAdventure(password, 'checkpoint', cp.id, {
      story_snippet:     cp.story_snippet,
      riddle_text:       cp.riddle_text,
      correct_answer:    cp.correct_answer,
      next_clue:         cp.next_clue,
      gps_lat:           cp.gps_lat,
      gps_lng:           cp.gps_lng,
      gps_radius_meters: cp.gps_radius_meters,
      points:            cp.points,
      difficulty:        cp.difficulty,
      hints:             cp.hints,
      hint_penalty:      cp.hint_penalty,
      clue_audio_url:    cp.clue_audio_url,
    })
    if (!res.success) return res.error || 'Save failed'
  }, [password])

  const saveArtifact = useCallback(async (art) => {
    const res = await updateAdventure(password, 'artifact', art.id, {
      name:         art.name,
      flavour_text: art.flavour_text,
      icon:         art.icon,
      image_url:    art.image_url,
    })
    if (!res.success) return res.error || 'Save failed'
  }, [password])

  function setCp(i, key, val) {
    setCps(prev => prev.map((cp, idx) => idx === i ? { ...cp, [key]: val } : cp))
  }

  function setArt(i, key, val) {
    setArts(prev => prev.map((a, idx) => idx === i ? { ...a, [key]: val } : a))
  }

  // ── Auth screen ──
  if (!authed) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px', background: NIGHT_INK }}>
      <div style={{ width: '100%', maxWidth: '300px' }}>
        <p style={{ fontSize: '12px', color: D.faint, margin: '0 0 4px' }}>Gansbaai Adventure Network</p>
        <h1 style={{ fontSize: '20px', fontWeight: '500', color: '#fff', margin: '0 0 24px' }}>
          Edit Adventure
        </h1>
        <input type="password" value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="Admin password"
          style={{ ...inputStyle, marginBottom: '10px' }} />
        {authError && <p style={{ color: SIGNAL_CORAL, fontSize: '13px', marginBottom: '10px' }}>{authError}</p>}
        <button onClick={handleLogin} disabled={!password || loading}
          style={{ width: '100%', background: '#fff', color: '#000', border: 'none',
            padding: '13px', borderRadius: '8px', fontSize: '15px', fontWeight: '500',
            opacity: !password || loading ? 0.5 : 1, cursor: 'pointer' }}>
          {loading ? 'Loading...' : 'Continue'}
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: NIGHT_INK, color: '#fff',
      padding: '24px', maxWidth: '640px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => navigate('/admin')} style={{
          background: 'none', border: `1px solid ${D.border}`, color: D.muted,
          padding: '7px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer'
        }}>← Admin</button>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '11px', color: D.faint, margin: '0 0 4px' }}>Editing adventure</p>
          <select value={selectedSlug} onChange={e => setSelectedSlug(e.target.value)}
            style={{ background: D.surface, color: '#fff', border: `1px solid ${D.borderMid}`,
              borderRadius: '6px', padding: '6px 10px', fontSize: '14px', fontWeight: '600' }}>
            {adventures.map(a => (
              <option key={a.slug} value={a.slug}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <p style={{ color: D.muted, textAlign: 'center', padding: '40px 0' }}>Loading...</p>
      )}
      {loadError && (
        <p style={{ color: SIGNAL_CORAL, textAlign: 'center', padding: '40px 0' }}>{loadError}</p>
      )}

      {data && adv && (
        <>
          {/* ── Adventure details ── */}
          <Section title="Adventure Details" defaultOpen={true}>
            <Field label="Name">
              <input style={inputStyle} value={adv.name}
                onChange={e => setAdv(a => ({ ...a, name: e.target.value }))} />
            </Field>
            <Field label="Icon (emoji)">
              <input style={{ ...inputStyle, width: '80px' }} value={adv.icon}
                onChange={e => setAdv(a => ({ ...a, icon: e.target.value }))} />
            </Field>
            <Field label="Story Intro">
              <textarea style={textarea} value={adv.story_intro || ''}
                onChange={e => setAdv(a => ({ ...a, story_intro: e.target.value }))} />
            </Field>
            <Field label="Story Outro">
              <textarea style={textarea} value={adv.story_outro || ''}
                onChange={e => setAdv(a => ({ ...a, story_outro: e.target.value }))} />
            </Field>
            <Field label="Ambient Audio URL">
              <input style={inputStyle} value={adv.ambient_audio_url || ''}
                onChange={e => setAdv(a => ({ ...a, ambient_audio_url: e.target.value }))}
                placeholder="https://..." />
            </Field>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <input type="checkbox" id="is_active" checked={adv.is_active}
                onChange={e => setAdv(a => ({ ...a, is_active: e.target.checked }))} />
              <label htmlFor="is_active" style={{ fontSize: '13px', color: D.muted, cursor: 'pointer' }}>
                Adventure is active (visible to players)
              </label>
            </div>
            <SaveButton onSave={saveAdventure} />
          </Section>

          {/* ── Checkpoint picker ── */}
          <div style={{ marginBottom: '8px' }}>
            <span style={label}>Checkpoint</span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {cps.map((cp, i) => (
                <button key={cp.id} onClick={() => setCpIndex(i)} style={{
                  padding: '6px 14px', borderRadius: '6px', fontSize: '13px',
                  fontWeight: '600', cursor: 'pointer', border: 'none',
                  background: i === cpIndex ? ROUTE_BLUE : D.surface,
                  color: i === cpIndex ? '#000' : D.muted,
                }}>
                  {cp.sequence}
                </button>
              ))}
            </div>
          </div>

          {cps[cpIndex] && (
            <>
              {/* ── Checkpoint details ── */}
              <Section title={`Checkpoint ${cps[cpIndex].sequence} — ${cps[cpIndex].slug}`} defaultOpen={true}>
                <Field label="Story Snippet">
                  <textarea style={textarea} value={cps[cpIndex].story_snippet}
                    onChange={e => setCp(cpIndex, 'story_snippet', e.target.value)} />
                </Field>
                <Field label="Riddle Text">
                  <textarea style={textarea} value={cps[cpIndex].riddle_text}
                    onChange={e => setCp(cpIndex, 'riddle_text', e.target.value)} />
                </Field>
                <Field label='Correct Answer (plain string or JSON array e.g. ["kelp","seaweed"])'>
                  <input style={inputStyle} value={cps[cpIndex].correct_answer}
                    onChange={e => setCp(cpIndex, 'correct_answer', e.target.value)} />
                </Field>
                <Field label="Next Clue (shown on solve, guides to next checkpoint)">
                  <textarea style={{ ...textarea, minHeight: '60px' }} value={cps[cpIndex].next_clue || ''}
                    onChange={e => setCp(cpIndex, 'next_clue', e.target.value)} />
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <Field label="GPS Latitude">
                    <input style={inputStyle} value={cps[cpIndex].gps_lat}
                      onChange={e => setCp(cpIndex, 'gps_lat', e.target.value)} />
                  </Field>
                  <Field label="GPS Longitude">
                    <input style={inputStyle} value={cps[cpIndex].gps_lng}
                      onChange={e => setCp(cpIndex, 'gps_lng', e.target.value)} />
                  </Field>
                  <Field label="GPS Radius (meters)">
                    <input type="number" style={inputStyle} value={cps[cpIndex].gps_radius_meters}
                      onChange={e => setCp(cpIndex, 'gps_radius_meters', e.target.value)} />
                  </Field>
                  <Field label="Points">
                    <input type="number" style={inputStyle} value={cps[cpIndex].points}
                      onChange={e => setCp(cpIndex, 'points', e.target.value)} />
                  </Field>
                </div>
                <Field label="Difficulty">
                  <select style={{ ...inputStyle, width: 'auto' }} value={cps[cpIndex].difficulty}
                    onChange={e => setCp(cpIndex, 'difficulty', e.target.value)}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </Field>
                <Field label="Hint 1">
                  <input style={inputStyle} value={cps[cpIndex].hints?.[0] || ''}
                    onChange={e => {
                      const h = [...(cps[cpIndex].hints || ['', ''])]
                      h[0] = e.target.value
                      setCp(cpIndex, 'hints', h)
                    }} />
                </Field>
                <Field label="Hint 2">
                  <input style={inputStyle} value={cps[cpIndex].hints?.[1] || ''}
                    onChange={e => {
                      const h = [...(cps[cpIndex].hints || ['', ''])]
                      h[1] = e.target.value
                      setCp(cpIndex, 'hints', h)
                    }} />
                </Field>
                <Field label="Hint Penalty (points per hint)">
                  <input type="number" style={{ ...inputStyle, width: '100px' }}
                    value={cps[cpIndex].hint_penalty}
                    onChange={e => setCp(cpIndex, 'hint_penalty', e.target.value)} />
                </Field>
                <Field label="Clue Audio URL (optional)">
                  <input style={inputStyle} value={cps[cpIndex].clue_audio_url || ''}
                    onChange={e => setCp(cpIndex, 'clue_audio_url', e.target.value)}
                    placeholder="https://..." />
                </Field>
                <SaveButton onSave={() => saveCheckpoint(cps[cpIndex])} />
              </Section>

              {/* ── Artifact for this checkpoint ── */}
              {(() => {
                const artIdx = arts.findIndex(a => a.checkpoint_sequence === cps[cpIndex].sequence)
                const art = arts[artIdx]
                if (!art) return (
                  <p style={{ color: D.faint, fontSize: '13px', marginBottom: '16px' }}>
                    No artifact linked to this checkpoint.
                  </p>
                )
                return (
                  <Section title={`Artifact — ${art.name || 'Untitled'}`}>
                    <Field label="Name">
                      <input style={inputStyle} value={art.name}
                        onChange={e => setArt(artIdx, 'name', e.target.value)} />
                    </Field>
                    <Field label="Flavour Text">
                      <textarea style={{ ...textarea, minHeight: '60px' }} value={art.flavour_text || ''}
                        onChange={e => setArt(artIdx, 'flavour_text', e.target.value)} />
                    </Field>
                    <Field label="Icon (emoji)">
                      <input style={{ ...inputStyle, width: '80px' }} value={art.icon || ''}
                        onChange={e => setArt(artIdx, 'icon', e.target.value)} />
                    </Field>
                    <Field label="Image URL">
                      <input style={inputStyle} value={art.image_url || ''}
                        onChange={e => setArt(artIdx, 'image_url', e.target.value)}
                        placeholder="https://..." />
                    </Field>
                    {art.image_url && (
                      <img src={art.image_url} alt={art.name}
                        style={{ width: '100%', maxHeight: '160px', objectFit: 'contain',
                          borderRadius: '8px', marginBottom: '14px', background: '#050505' }} />
                    )}
                    <SaveButton onSave={() => saveArtifact(art)} />
                  </Section>
                )
              })()}
            </>
          )}
        </>
      )}
    </div>
  )
}