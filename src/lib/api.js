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
  