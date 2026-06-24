import { useState, useEffect } from 'react'
import { createAdventure, listPartners, uploadArtifactImage } from '../lib/api'

// ─── Theme ─────────────────────────────────────────────────────────────────────
const T = {
  bg:            '#0a0a0a',
  surface:       '#111111',
  surfaceAlt:    '#1a1a1a',
  border:        '#1f1f1f',
  borderMid:     '#2a2a2a',
  text:          '#ffffff',
  muted:         '#888888',
  faint:         '#444444',
  accent:        '#C8953A',
  accentDim:     '#7a5a22',
  success:       '#1D9E75',
  successBg:     '#052e16',
  successBorder: '#166534',
  successText:   '#86efac',
  errorBg:       '#2d1212',
  errorBorder:   '#991b1b',
  errorText:     '#fca5a5',
}

const STEPS = ['Adventure', 'Checkpoints', 'Artifacts', 'Partners', 'Review']

function slugify(s) {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

const emptyCheckpoint = (n) => ({
  sequence: n, slug: '', story_snippet: '', riddle_text: '', answer: '', next_clue: '',
  gps_lat: '', gps_lng: '', gps_radius_meters: 50, points: 100, difficulty: 'medium',
  hints: ['', ''], hint_penalty: 10,
})

const emptyArtifact = (n) => ({
  sequence: n, name: '', flavour_text: '', icon: '', image_url: '',
})

// ─── Shared field styles ─────────────────────────────────────────────────────────
const label = { fontSize: '12px', fontWeight: '600', color: T.muted, marginBottom: '6px', display: 'block' }
const input = {
  width: '100%', background: T.surface, border: `1px solid ${T.borderMid}`,
  borderRadius: '8px', padding: '12px 14px', color: T.text, fontSize: '14px',
  marginBottom: '16px', boxSizing: 'border-box', fontFamily: 'inherit',
}
const textarea = { ...input, resize: 'vertical', minHeight: '80px', lineHeight: '1.5' }

function Field({ children }) {
  return <div>{children}</div>
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function AdminNewAdventurePage() {
  // Auth
  const [password, setPassword] = useState('')
  const [authed, setAuthed]       = useState(false)
  const [authError, setAuthError] = useState('')

  // Wizard state
  const [step, setStep] = useState(0)
  const [cpIndex, setCpIndex] = useState(0)   // sub-index 0-6 for checkpoints/artifacts

  const [adventure, setAdventure] = useState({ name: '', slug: '', icon: '🧭', story_intro: '', story_outro: '' })
  const [slugTouched, setSlugTouched] = useState(false)
  const [numCheckpoints, setNumCheckpoints] = useState(7)
  const [checkpoints, setCheckpoints] = useState(
    Array.from({ length: 7 }, (_, i) => emptyCheckpoint(i + 1))
  )
  const [artifacts, setArtifacts] = useState(
    Array.from({ length: 7 }, (_, i) => emptyArtifact(i + 1))
  )

  // Resize checkpoints/artifacts arrays when the checkpoint count changes,
  // preserving any data already entered for existing positions.
  function resizeCheckpoints(newCount) {
    setCheckpoints(cps => Array.from({ length: newCount }, (_, i) =>
      cps[i] ? { ...cps[i], sequence: i + 1 } : emptyCheckpoint(i + 1)
    ))
    setArtifacts(arts => Array.from({ length: newCount }, (_, i) =>
      arts[i] ? { ...arts[i], sequence: i + 1 } : emptyArtifact(i + 1)
    ))
    // Drop partner assignments pointing at checkpoints that no longer exist
    setAssignments(a => a.filter(row => row.checkpoint_sequence <= newCount))
    setNumCheckpoints(newCount)
    setCpIndex(0)
  }

  // Partners
  const [availablePartners, setAvailablePartners] = useState([])
  const [partnersLoaded, setPartnersLoaded] = useState(false)
  const [assignments, setAssignments] = useState([]) // {partner_id, checkpoint_sequence, reward_description}

  // Submission
  const [submitting, setSubmitting] = useState(false)
  const [submitErrors, setSubmitErrors] = useState([])
  const [submitResult, setSubmitResult] = useState(null)

  // Artifact image upload
  const [uploadingIndex, setUploadingIndex] = useState(null)
  const [uploadError, setUploadError] = useState('')

  // ── Auth ────────────────────────────────────────────────────────────────────
  async function handlePassword() {
    if (!password) return
    setAuthError('')
    const res = await listPartners(password)
    if (res.error) { setAuthError('Incorrect password.'); return }
    setAvailablePartners(res.partners || [])
    setPartnersLoaded(true)
    setAuthed(true)
  }

  // ── Auto-slug from name ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!slugTouched) {
      setAdventure(a => ({ ...a, slug: slugify(a.name) }))
    }
  }, [adventure.name])

  // Clear stale upload errors when navigating between artifacts
  useEffect(() => {
    setUploadError('')
  }, [cpIndex, step])

  function updateCheckpoint(i, field, value) {
    setCheckpoints(cps => cps.map((c, idx) => idx === i ? { ...c, [field]: value } : c))
  }
  function updateArtifact(i, field, value) {
    setArtifacts(arts => arts.map((a, idx) => idx === i ? { ...a, [field]: value } : a))
  }
  function updateHint(i, hintIndex, value) {
    setCheckpoints(cps => cps.map((c, idx) => {
      if (idx !== i) return c
      const hints = [...c.hints]
      hints[hintIndex] = value
      return { ...c, hints }
    }))
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleImageUpload(i, file) {
    if (!file) return
    setUploadError('')
    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file (JPEG, PNG, WEBP, or GIF).')
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setUploadError('Image must be under 3MB.')
      return
    }
    setUploadingIndex(i)
    try {
      const base64 = await fileToBase64(file)
      const res = await uploadArtifactImage({ password, content_type: file.type, data_base64: base64 })
      if (res.error) {
        setUploadError(res.message || res.error)
      } else {
        updateArtifact(i, 'image_url', res.url)
      }
    } catch {
      setUploadError('Upload failed — please try again.')
    }
    setUploadingIndex(null)
  }

  // Auto-slug for checkpoint from riddle/story when empty
  function autoSlugCheckpoint(i) {
    const c = checkpoints[i]
    if (!c.slug && c.story_snippet) {
      updateCheckpoint(i, 'slug', `${adventure.slug || 'cp'}-${c.sequence}`)
    }
  }

  function addAssignment() {
    setAssignments(a => [...a, { partner_id: '', checkpoint_sequence: 1, reward_description: '' }])
  }
  function updateAssignment(i, field, value) {
    setAssignments(a => a.map((row, idx) => idx === i ? { ...row, [field]: value } : row))
  }
  function removeAssignment(i) {
    setAssignments(a => a.filter((_, idx) => idx !== i))
  }

  // ── Completion indicators ────────────────────────────────────────────────────
  function checkpointComplete(c) {
    const baseValid = c.slug && c.story_snippet && c.riddle_text && c.answer &&
      c.gps_lat !== '' && c.gps_lng !== '' && c.gps_radius_meters && c.points
    const isLast = c.sequence === numCheckpoints
    return baseValid && (isLast || c.next_clue?.trim())
  }
  function artifactComplete(a) {
    return a.name && (a.icon || a.image_url)
  }

  const step1Valid = adventure.name.trim() && adventure.slug.trim()
  const step2Valid = checkpoints.every(checkpointComplete)
  const step3Valid = artifacts.every(artifactComplete)

  // ── Submit ────────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitting(true)
    setSubmitErrors([])
    const payload = {
      password,
      adventure,
      checkpoints,
      artifacts,
      partners: assignments.filter(a => a.partner_id),
    }
    const res = await createAdventure(payload)
    setSubmitting(false)
    if (res.error === 'validation_failed') {
      setSubmitErrors(res.errors || ['Validation failed.'])
      return
    }
    if (res.error) {
      setSubmitErrors([res.detail || res.error])
      return
    }
    setSubmitResult(res)
  }

  // ── Auth gate ────────────────────────────────────────────────────────────────
  if (!authed) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '300px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '14px' }}>🧭</div>
        <h1 style={{ fontSize: '18px', fontWeight: '500', margin: '0 0 6px' }}>New Adventure</h1>
        <p style={{ color: T.muted, fontSize: '13px', margin: '0 0 24px' }}>Admin access required</p>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handlePassword()}
          placeholder="Admin password"
          style={{ ...input, textAlign: 'center', marginBottom: '12px' }}
        />
        {authError && <p style={{ color: T.errorText, fontSize: '13px', marginBottom: '10px' }}>{authError}</p>}
        <button onClick={handlePassword}
          style={{ width: '100%', background: T.text, color: '#000', border: 'none',
            padding: '13px', borderRadius: '8px', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}>
          Continue
        </button>
      </div>
    </div>
  )

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitResult) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
        <h1 style={{ fontSize: '22px', fontWeight: '600', margin: '0 0 8px' }}>Adventure created</h1>
        <p style={{ color: T.muted, fontSize: '14px', marginBottom: '24px' }}>
          "{adventure.name}" is live with {checkpoints.length} checkpoints, {artifacts.length} artifacts, and {assignments.filter(a=>a.partner_id).length} partner reward{assignments.filter(a=>a.partner_id).length === 1 ? '' : 's'}.
        </p>
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '10px',
          padding: '16px', marginBottom: '20px', textAlign: 'left' }}>
          <p style={{ fontSize: '11px', color: T.faint, margin: '0 0 4px', textTransform: 'uppercase' }}>
            Registration link
          </p>
          <p style={{ fontFamily: 'monospace', fontSize: '13px', color: T.accent, margin: 0, wordBreak: 'break-all' }}>
            /register?adventure={adventure.slug}
          </p>
        </div>
        <button onClick={() => window.location.reload()}
          style={{ width: '100%', background: T.text, color: '#000', border: 'none',
            padding: '13px', borderRadius: '8px', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}>
          Create another adventure
        </button>
      </div>
    </div>
  )

  const cp  = checkpoints[cpIndex]
  const art = artifacts[cpIndex]

  return (
    <div style={{ minHeight: '100vh', padding: '24px', maxWidth: '600px', margin: '0 auto' }}>

      {/* ── Step indicator ── */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              height: '3px', borderRadius: '2px', marginBottom: '6px',
              background: i <= step ? T.accent : T.border,
            }} />
            <span style={{ fontSize: '11px', color: i === step ? T.text : T.faint }}>{s}</span>
          </div>
        ))}
      </div>

      {/* ════════════════ STEP 0 — Adventure details ════════════════ */}
      {step === 0 && (
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 20px' }}>Adventure details</h2>

          <Field>
            <label style={label}>Adventure name</label>
            <input style={input} value={adventure.name}
              onChange={e => setAdventure(a => ({ ...a, name: e.target.value }))}
              placeholder="e.g. The Lighthouse Keeper's Secret" />
          </Field>

          <Field>
            <label style={label}>Slug (used in URLs)</label>
            <input style={input} value={adventure.slug}
              onChange={e => { setSlugTouched(true); setAdventure(a => ({ ...a, slug: slugify(e.target.value) })) }}
              placeholder="lighthouse-keepers-secret" />
          </Field>

          <Field>
            <label style={label}>Icon (shown on the landing page)</label>
            <input style={{ ...input, maxWidth: '120px', fontSize: '24px', textAlign: 'center' }}
              value={adventure.icon}
              onChange={e => setAdventure(a => ({ ...a, icon: e.target.value }))}
              placeholder="🧭" />
            <p style={{ fontSize: '12px', color: T.faint, margin: '-10px 0 16px' }}>
              Any single emoji — 🦈 🧭 🐧 ⚓ 🗼 all work well.
            </p>
          </Field>

          <Field>
            <label style={label}>Intro text (shown on registration page)</label>
            <textarea style={textarea} value={adventure.story_intro}
              onChange={e => setAdventure(a => ({ ...a, story_intro: e.target.value }))}
              placeholder="A short hook to draw players in..." />
          </Field>

          <Field>
            <label style={label}>Story ending (shown on the completion screen and in the completion email)</label>
            <textarea style={textarea} value={adventure.story_outro}
              onChange={e => setAdventure(a => ({ ...a, story_outro: e.target.value }))}
              placeholder="How the story wraps up — what really happened, why it mattered..." />
          </Field>

          <Field>
            <label style={label}>Number of checkpoints</label>
            <input style={{ ...input, maxWidth: '120px' }} type="number" min={2} max={30}
              value={numCheckpoints}
              onChange={e => {
                const n = Math.max(2, Math.min(30, Number(e.target.value) || 2))
                resizeCheckpoints(n)
              }} />
            <p style={{ fontSize: '12px', color: T.faint, margin: '-10px 0 16px' }}>
              Adventures can be any length — 5, 7, 12, 20 checkpoints, etc.
              Changing this resizes the checkpoint and artifact steps (existing entries are kept where possible).
            </p>
          </Field>
        </div>
      )}

      {/* ════════════════ STEP 1 — Checkpoints ════════════════ */}
      {step === 1 && (
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px' }}>Checkpoints</h2>

          {/* Sub-navigation dots */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
            {checkpoints.map((c, i) => (
              <button key={i} onClick={() => setCpIndex(i)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: '6px',
                  background: i === cpIndex ? T.accent : (checkpointComplete(c) ? T.successBg : T.surface),
                  color: i === cpIndex ? '#000' : (checkpointComplete(c) ? T.successText : T.muted),
                  fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                  border: `1px solid ${i === cpIndex ? T.accent : T.border}`,
                }}>
                {i + 1}
              </button>
            ))}
          </div>

          <p style={{ fontSize: '13px', color: T.muted, marginBottom: '16px' }}>
            Checkpoint {cp.sequence} of {checkpoints.length}
          </p>

          <Field>
            <label style={label}>Checkpoint slug (used in QR / route)</label>
            <input style={input} value={cp.slug}
              onFocus={() => autoSlugCheckpoint(cpIndex)}
              onChange={e => updateCheckpoint(cpIndex, 'slug', slugify(e.target.value))}
              placeholder={`${adventure.slug || 'adventure'}-${cp.sequence}`} />
          </Field>

          <Field>
            <label style={label}>Story snippet (shown before the riddle)</label>
            <textarea style={textarea} value={cp.story_snippet}
              onChange={e => updateCheckpoint(cpIndex, 'story_snippet', e.target.value)}
              placeholder="Narrative leading into this checkpoint..." />
          </Field>

          <Field>
            <label style={label}>Riddle text</label>
            <textarea style={textarea} value={cp.riddle_text}
              onChange={e => updateCheckpoint(cpIndex, 'riddle_text', e.target.value)}
              placeholder="The clue the player must solve..." />
          </Field>

          <Field>
            <label style={label}>Correct answer</label>
            <input style={input} value={cp.answer}
              onChange={e => updateCheckpoint(cpIndex, 'answer', e.target.value)}
              placeholder="Case-insensitive match" />
          </Field>

          <Field>
            <label style={label}>
              Next clue {cp.sequence === numCheckpoints
                ? '(not needed — this is the final checkpoint)'
                : '(shown on success — guides the player to the next checkpoint)'}
            </label>
            <textarea style={textarea} value={cp.next_clue}
              disabled={cp.sequence === numCheckpoints}
              onChange={e => updateCheckpoint(cpIndex, 'next_clue', e.target.value)}
              placeholder={cp.sequence === numCheckpoints ? '' : "A clue pointing toward the next location — easy/medium difficulty, not literal directions..."} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field>
              <label style={label}>GPS latitude</label>
              <input style={input} value={cp.gps_lat} type="number" step="any"
                onChange={e => updateCheckpoint(cpIndex, 'gps_lat', e.target.value)}
                placeholder="-34.5798" />
            </Field>
            <Field>
              <label style={label}>GPS longitude</label>
              <input style={input} value={cp.gps_lng} type="number" step="any"
                onChange={e => updateCheckpoint(cpIndex, 'gps_lng', e.target.value)}
                placeholder="19.3517" />
            </Field>
          </div>

          {cp.gps_lat && cp.gps_lng && (
            <a href={`https://www.google.com/maps?q=${cp.gps_lat},${cp.gps_lng}`}
              target="_blank" rel="noreferrer"
              style={{ fontSize: '12px', color: T.accent, display: 'inline-block', marginBottom: '16px' }}>
              📍 Check this location on Google Maps →
            </a>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <Field>
              <label style={label}>Radius (m)</label>
              <input style={input} value={cp.gps_radius_meters} type="number"
                onChange={e => updateCheckpoint(cpIndex, 'gps_radius_meters', e.target.value)} />
            </Field>
            <Field>
              <label style={label}>Points</label>
              <input style={input} value={cp.points} type="number"
                onChange={e => updateCheckpoint(cpIndex, 'points', e.target.value)} />
            </Field>
            <Field>
              <label style={label}>Difficulty</label>
              <select style={input} value={cp.difficulty}
                onChange={e => updateCheckpoint(cpIndex, 'difficulty', e.target.value)}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </Field>
          </div>

          {/* Hints — optional, up to 2 per checkpoint */}
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: `1px solid ${T.border}` }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: T.accent, letterSpacing: '.1em',
              textTransform: 'uppercase', margin: '0 0 4px' }}>
              Hints (optional)
            </p>
            <p style={{ fontSize: '12px', color: T.faint, margin: '0 0 14px' }}>
              Leave blank for riddles that don't need help. Each hint revealed costs the player points.
            </p>

            <Field>
              <label style={label}>Hint 1</label>
              <input style={input} value={cp.hints[0] || ''}
                onChange={e => updateHint(cpIndex, 0, e.target.value)}
                placeholder="A gentle nudge in the right direction..." />
            </Field>

            <Field>
              <label style={label}>Hint 2</label>
              <input style={input} value={cp.hints[1] || ''}
                onChange={e => updateHint(cpIndex, 1, e.target.value)}
                placeholder="A more direct clue..." />
            </Field>

            <Field>
              <label style={label}>Point penalty per hint</label>
              <input style={{ ...input, maxWidth: '120px' }} value={cp.hint_penalty} type="number"
                onChange={e => updateCheckpoint(cpIndex, 'hint_penalty', e.target.value)} />
            </Field>
          </div>

          {/* Prev/next within checkpoints */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button disabled={cpIndex === 0} onClick={() => setCpIndex(i => i - 1)}
              style={{ ...navBtn, opacity: cpIndex === 0 ? 0.3 : 1 }}>← Previous checkpoint</button>
            <button disabled={cpIndex === checkpoints.length - 1} onClick={() => setCpIndex(i => i + 1)}
              style={{ ...navBtn, opacity: cpIndex === checkpoints.length - 1 ? 0.3 : 1 }}>Next checkpoint →</button>
          </div>
        </div>
      )}

      {/* ════════════════ STEP 2 — Artifacts ════════════════ */}
      {step === 2 && (
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px' }}>Artifacts</h2>
          <p style={{ fontSize: '13px', color: T.muted, marginBottom: '16px' }}>
            One collectible per checkpoint, shown when the player solves it.
          </p>

          <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
            {artifacts.map((a, i) => (
              <button key={i} onClick={() => setCpIndex(i)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: '6px',
                  background: i === cpIndex ? T.accent : (artifactComplete(a) ? T.successBg : T.surface),
                  color: i === cpIndex ? '#000' : (artifactComplete(a) ? T.successText : T.muted),
                  fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                  border: `1px solid ${i === cpIndex ? T.accent : T.border}`,
                }}>
                {i + 1}
              </button>
            ))}
          </div>

          <p style={{ fontSize: '13px', color: T.muted, marginBottom: '16px' }}>
            Artifact for checkpoint {art.sequence}
          </p>

          <Field>
            <label style={label}>Name</label>
            <input style={input} value={art.name}
              onChange={e => updateArtifact(cpIndex, 'name', e.target.value)}
              placeholder="e.g. Brass Anchor Pin" />
          </Field>

          <Field>
            <label style={label}>Flavour text</label>
            <textarea style={textarea} value={art.flavour_text}
              onChange={e => updateArtifact(cpIndex, 'flavour_text', e.target.value)}
              placeholder="A short evocative description shown with the artifact..." />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <Field>
              <label style={label}>Emoji icon (fallback)</label>
              <input style={input} value={art.icon}
                onChange={e => updateArtifact(cpIndex, 'icon', e.target.value)}
                placeholder="⚓" />
            </Field>
            <Field>
              <label style={label}>Artifact image</label>
              <label
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  const file = e.dataTransfer.files?.[0]
                  if (file) handleImageUpload(cpIndex, file)
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  border: `1px dashed ${T.borderMid}`, borderRadius: '8px',
                  padding: '12px 14px', cursor: 'pointer', marginBottom: 0,
                  background: T.surface,
                }}>
                {art.image_url ? (
                  <img src={art.image_url} alt="" style={{ width: '40px', height: '40px',
                    objectFit: 'cover', borderRadius: '6px', flexShrink: 0,
                    border: `1px solid ${T.border}` }} />
                ) : (
                  <span style={{ fontSize: '20px', flexShrink: 0 }}>🖼️</span>
                )}
                <span style={{ fontSize: '13px', color: T.muted, flex: 1 }}>
                  {uploadingIndex === cpIndex ? 'Uploading...'
                    : art.image_url ? 'Replace image — click or drop a new one'
                    : 'Click or drag an image here'}
                </span>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: 'none' }}
                  onChange={e => handleImageUpload(cpIndex, e.target.files?.[0])} />
              </label>
            </Field>
          </div>

          {art.image_url && (
            <button onClick={() => updateArtifact(cpIndex, 'image_url', '')}
              style={{ background: 'none', border: 'none', color: T.errorText,
                fontSize: '12px', cursor: 'pointer', padding: 0, marginBottom: '16px' }}>
              Remove image (use emoji icon instead)
            </button>
          )}

          {uploadError && (
            <p style={{ fontSize: '12px', color: T.errorText, marginTop: '-8px', marginBottom: '16px' }}>
              {uploadError}
            </p>
          )}

          <p style={{ fontSize: '12px', color: T.faint, marginBottom: '16px' }}>
            JPEG, PNG, WEBP, or GIF — up to 3MB. The emoji icon is used as a fallback wherever no image is set.
          </p>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button disabled={cpIndex === 0} onClick={() => setCpIndex(i => i - 1)}
              style={{ ...navBtn, opacity: cpIndex === 0 ? 0.3 : 1 }}>← Previous artifact</button>
            <button disabled={cpIndex === artifacts.length - 1} onClick={() => setCpIndex(i => i + 1)}
              style={{ ...navBtn, opacity: cpIndex === artifacts.length - 1 ? 0.3 : 1 }}>Next artifact →</button>
          </div>
        </div>
      )}

      {/* ════════════════ STEP 3 — Partners ════════════════ */}
      {step === 3 && (
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px' }}>Partner rewards</h2>
          <p style={{ fontSize: '13px', color: T.muted, marginBottom: '20px' }}>
            Optional. Assign existing partners to checkpoints with a reward for this adventure.
            Players get a unique code for each assigned partner when they complete the adventure.
          </p>

          {availablePartners.length === 0 && (
            <p style={{ color: T.faint, fontSize: '13px', marginBottom: '16px' }}>
              No partners exist yet — you can add this adventure without rewards and assign partners later.
            </p>
          )}

          {assignments.map((row, i) => (
            <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <Field>
                  <label style={label}>Partner</label>
                  <select style={{ ...input, marginBottom: 0 }} value={row.partner_id}
                    onChange={e => updateAssignment(i, 'partner_id', e.target.value)}>
                    <option value="">Select partner...</option>
                    {availablePartners.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </Field>
                <Field>
                  <label style={label}>Checkpoint</label>
                  <select style={{ ...input, marginBottom: 0 }} value={row.checkpoint_sequence}
                    onChange={e => updateAssignment(i, 'checkpoint_sequence', Number(e.target.value))}>
                    {Array.from({ length: numCheckpoints }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Field>
              </div>
              <Field>
                <label style={label}>Reward description (for this adventure)</label>
                <input style={{ ...input, marginBottom: '10px' }} value={row.reward_description}
                  onChange={e => updateAssignment(i, 'reward_description', e.target.value)}
                  placeholder="e.g. Free coffee with any pastry" />
              </Field>
              <button onClick={() => removeAssignment(i)}
                style={{ background: 'none', border: 'none', color: T.errorText,
                  fontSize: '12px', cursor: 'pointer', padding: 0 }}>
                Remove
              </button>
            </div>
          ))}

          <button onClick={addAssignment}
            disabled={availablePartners.length === 0}
            style={{ ...navBtn, width: '100%', opacity: availablePartners.length === 0 ? 0.3 : 1 }}>
            + Add partner reward
          </button>
        </div>
      )}

      {/* ════════════════ STEP 4 — Review ════════════════ */}
      {step === 4 && (
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px' }}>Review & create</h2>

          <div style={{ background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
            <p style={{ fontSize: '11px', color: T.faint, textTransform: 'uppercase', margin: '0 0 4px' }}>Adventure</p>
            <p style={{ fontSize: '15px', fontWeight: '600', margin: '0 0 2px' }}>{adventure.name}</p>
            <p style={{ fontSize: '12px', color: T.muted, fontFamily: 'monospace', margin: 0 }}>/{adventure.slug}</p>
          </div>

          <div style={{ background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
            <p style={{ fontSize: '11px', color: T.faint, textTransform: 'uppercase', margin: '0 0 10px' }}>
              Checkpoints ({checkpoints.length})
            </p>
            {checkpoints.map(c => (
              <div key={c.sequence} style={{ display: 'flex', justifyContent: 'space-between',
                fontSize: '13px', padding: '4px 0', color: T.muted }}>
                <span>{c.sequence}. {c.slug || '(no slug)'}</span>
                <span>{c.points} pts · {c.difficulty}</span>
              </div>
            ))}
          </div>

          <div style={{ background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
            <p style={{ fontSize: '11px', color: T.faint, textTransform: 'uppercase', margin: '0 0 10px' }}>
              Artifacts ({artifacts.length})
            </p>
            {artifacts.map(a => (
              <div key={a.sequence} style={{ display: 'flex', justifyContent: 'space-between',
                fontSize: '13px', padding: '4px 0', color: T.muted }}>
                <span>{a.icon || '🖼️'} {a.name || '(unnamed)'}</span>
              </div>
            ))}
          </div>

          <div style={{ background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
            <p style={{ fontSize: '11px', color: T.faint, textTransform: 'uppercase', margin: '0 0 10px' }}>
              Partner rewards ({assignments.filter(a=>a.partner_id).length})
            </p>
            {assignments.filter(a=>a.partner_id).length === 0 && (
              <p style={{ fontSize: '13px', color: T.faint, margin: 0 }}>None assigned</p>
            )}
            {assignments.filter(a=>a.partner_id).map((a, i) => {
              const p = availablePartners.find(p => p.id === a.partner_id)
              return (
                <div key={i} style={{ fontSize: '13px', padding: '4px 0', color: T.muted }}>
                  Checkpoint {a.checkpoint_sequence}: {p?.name} — {a.reward_description}
                </div>
              )
            })}
          </div>

          {submitErrors.length > 0 && (
            <div style={{ background: T.errorBg, border: `1px solid ${T.errorBorder}`,
              borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', fontWeight: '700', color: T.errorText,
                textTransform: 'uppercase', margin: '0 0 8px' }}>
                {submitErrors.length} issue{submitErrors.length > 1 ? 's' : ''} found
              </p>
              {submitErrors.map((e, i) => (
                <p key={i} style={{ fontSize: '13px', color: T.errorText, margin: '4px 0', lineHeight: '1.5' }}>
                  • {e}
                </p>
              ))}
            </div>
          )}

          <button onClick={handleSubmit} disabled={submitting}
            style={{ width: '100%', padding: '16px', border: 'none', borderRadius: '12px',
              background: T.success, color: '#fff', fontSize: '16px', fontWeight: '600',
              cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Creating adventure...' : 'Create adventure'}
          </button>
        </div>
      )}

      {/* ── Footer navigation ── */}
      {step < 4 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px',
          paddingTop: '20px', borderTop: `1px solid ${T.border}` }}>
          <button onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            style={{ ...footerBtn, opacity: step === 0 ? 0.3 : 1 }}>
            ← Back
          </button>
          <button onClick={() => { setStep(s => s + 1); setCpIndex(0) }}
            disabled={
              (step === 0 && !step1Valid) ||
              (step === 1 && !step2Valid) ||
              (step === 2 && !step3Valid)
            }
            style={{
              ...footerBtn, background: T.text, color: '#000', borderColor: T.text,
              opacity: (step === 0 && !step1Valid) || (step === 1 && !step2Valid) || (step === 2 && !step3Valid) ? 0.3 : 1,
            }}>
            {step === 3 ? 'Review →' : 'Continue →'}
          </button>
        </div>
      )}
      {step === 4 && (
        <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: `1px solid ${T.border}` }}>
          <button onClick={() => setStep(3)} style={footerBtn}>← Back to partners</button>
        </div>
      )}
    </div>
  )
}

const navBtn = {
  background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.muted,
  borderRadius: '8px', padding: '10px 14px', fontSize: '13px', cursor: 'pointer', flex: 1,
}

const footerBtn = {
  background: 'transparent', border: `1px solid ${T.border}`, color: T.text,
  borderRadius: '8px', padding: '12px 22px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
}