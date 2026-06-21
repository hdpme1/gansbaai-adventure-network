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