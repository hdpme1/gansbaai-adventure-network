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

export const createSession     = (data) => post('create-session', data)
export const validateCheckpoint = (data) => post('validate-checkpoint', data)

export function getSession(sessionId) {
  return fetch(BASE + '/get-session?session_id=' + sessionId, {
    headers: { 'apikey': KEY }
  }).then(r => r.json())
}

export function sendCompletion(sessionId) {
  return post('send-completion', { session_id: sessionId })
}

export const getAdminStats = (password) =>
  post('get-admin-stats', { password, adventure_slug: 'lost-shark-logbook' })

export const getPartnerStats = (slug, pin) =>
  post('get-partner-stats', { partner_slug: slug, pin })