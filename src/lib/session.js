// Centralizes how session_id is read/written in localStorage so every page
// follows the same rule, instead of each page doing its own raw
// localStorage.getItem('session_id').
//
// Two layers:
//   - ACTIVE_KEY    — "whatever the player is doing right now," a single
//                      pointer. Used by pages that only know a checkpoint
//                      slug (not an adventure slug) until after they've
//                      fetched the session — CheckpointPage, CompletePage.
//   - scoped key     — one session_id per adventure slug, so finishing (or
//                      starting) one adventure never overwrites another.
//                      Used by LandingPage, which always knows the
//                      adventure slug from the URL before it needs a
//                      session_id at all.
//
// This is also the natural extension point if a "your adventures" hub gets
// built later — list every 'session:*' key.

const ACTIVE_KEY = 'session_id'
const scopedKey = (adventureSlug) => 'session:' + adventureSlug

export function saveSession(adventureSlug, sessionId) {
  localStorage.setItem(ACTIVE_KEY, sessionId)
  localStorage.setItem(scopedKey(adventureSlug), sessionId)
}

export function getActiveSessionId() {
  return localStorage.getItem(ACTIVE_KEY)
}

export function getSessionForAdventure(adventureSlug) {
  return localStorage.getItem(scopedKey(adventureSlug))
}

// Refreshes just the active pointer — used when LandingPage finds a valid
// per-adventure session and resumes into it, so CheckpointPage/CompletePage
// (which only read the active pointer) pick up the right one too.
export function setActiveSessionId(sessionId) {
  localStorage.setItem(ACTIVE_KEY, sessionId)
}

// Clears a specific adventure's scoped session AND the active pointer.
// Call this when a session is confirmed dead (404 from get-session) so the
// stale UUID doesn't keep overwriting fresh sessions on the next visit.
export function clearSession(adventureSlug) {
  localStorage.removeItem(ACTIVE_KEY)
  if (adventureSlug) localStorage.removeItem(scopedKey(adventureSlug))
}

// Nuclear option — clears ALL session keys. Used when we don't know
// which adventure slug is affected (e.g. CheckpointPage gets a 404
// and doesn't have the adventure slug readily available).
export function clearAllSessions() {
  localStorage.removeItem(ACTIVE_KEY)
  Object.keys(localStorage)
    .filter(key => key.startsWith('session:'))
    .forEach(key => localStorage.removeItem(key))
}