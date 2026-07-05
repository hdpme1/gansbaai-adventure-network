const BASE = import.meta.env.VITE_SUPABASE_URL + '/functions/v1'
const KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY

async function post(name, body) {
  const res = await fetch(BASE + '/' + name, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': KEY },
    body: JSON.stringify(body),
  })
  return res.json()
}

export const createSession      = (data)              => post('create-session',  data)
export const validateCheckpoint = (data)              => post('validate-checkpoint', data)
export const sendCompletion     = (sessionId)         => post('send-completion', { session_id: sessionId })
export const getAdminStats      = (password, adventureSlug) =>
  post('get-admin-stats', { password, adventure_slug: adventureSlug })
export const getPartnerStats    = (slug, pin)         => post('get-partner-stats', { partner_slug: slug, pin })
export const redeemCode         = (code, slug, pin)   => post('redeem-code', { code, partner_slug: slug, pin })
export const listPartners       = (password)          => post('list-partners', { password })
export const createAdventure    = (payload)           => post('create-adventure', payload)
export const getHint            = (data)              => post('get-hint', data)
export const uploadArtifactImage = (payload)          => post('upload-artifact-image', payload)

// Computes how close the player is to the current checkpoint.
// Returns { distance_meters, radius_meters, percentage, is_inside } —
// checkpoint GPS coordinates are never returned to the client.
export const getProximity = (sessionId, lat, lng) =>
  post('get-proximity', { session_id: sessionId, player_lat: lat, player_lng: lng })

export function getAdventure(slug) {
  return fetch(BASE + '/get-adventure?slug=' + encodeURIComponent(slug), {
    headers: { 'apikey': KEY }
  }).then(r => r.json())
}

export function getSession(sessionId) {
  return fetch(BASE + '/get-session?session_id=' + sessionId, {
    headers: { 'apikey': KEY }
  }).then(r => r.json())
}

export function listAdventures(regionSlug) {
  const url = BASE + '/list-adventures' + (regionSlug ? `?region=${regionSlug}` : '')
  return fetch(url, { headers: { 'apikey': KEY } }).then(r => r.json())
}

export function listRegions() {
  return fetch(BASE + '/list-regions', {
    headers: { 'apikey': KEY }
  }).then(r => r.json())
}

export const getAdventureFull = (password, slug) =>
  post('get-adventure-full', { password, slug })

export const updateAdventure = (password, target, id, fields) =>
  post('update-adventure', { password, target, id, fields })
// ── Collectables ─────────────────────────────────────────────────────────────

// Fetch a player's full collection by phone number.
// Used by the /collection display case page.
export const getPlayerCollection = (phone) =>
  post('get-player-collection', { phone })

// Upload a GLB collectable file to Supabase Storage.
// Used by the admin builder. Returns { url } on success.
export const uploadCollectable = (payload) =>
  post('upload-collectable', payload)