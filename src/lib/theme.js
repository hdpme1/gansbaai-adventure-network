// PLAYCE Design Tokens — single source of truth.
// All pages import from here. No more per-file T/THEME objects.
//
// Two surface contexts:
//   LIGHT — player info screens (hub, register, story, puzzle).
//            Map Cream background, Night Ink text, Route Blue CTAs.
//   DARK  — dramatic moments (arrival/spot-found, success, complete, admin).
//            Night Ink background, white text, Lime CTAs.
//
// Brand colours are also exported flat for cases where a single value is
// needed without a full context object (e.g. SVG fills, chart colours).

// ── Raw palette ─────────────────────────────────────────────────────────────
export const NIGHT_INK    = '#10121B'
export const ROUTE_BLUE   = '#5364FF'
export const UNLOCK_LIME  = '#D8FF43'
export const SIGNAL_CORAL = '#FF5C68'
export const MAP_CREAM    = '#F7F5EE'

// ── Light surface — player-facing info screens ───────────────────────────────
export const L = {
  bg:            MAP_CREAM,
  surface:       '#FFFFFF',
  surfaceAlt:    '#EDEAE2',
  border:        '#E2DFD8',
  borderMid:     '#CCC9C0',

  ink:           NIGHT_INK,     // primary text on light bg
  muted:         '#6B6860',     // secondary text
  faint:         '#A8A59D',     // tertiary / placeholders

  primary:       ROUTE_BLUE,    // CTA buttons on light
  primaryText:   '#FFFFFF',
  lime:          UNLOCK_LIME,   // achievement highlights
  limeText:      NIGHT_INK,
  coral:         SIGNAL_CORAL,  // errors / alerts

  errorBg:       '#FFF0F1',
  errorBorder:   '#FFD0D4',
  errorText:     '#C0002A',

  successBg:     '#F0FFF4',
  successBorder: '#A8EFC0',
  successText:   '#006B35',
}

// ── Dark surface — dramatic moments + admin ──────────────────────────────────
export const D = {
  bg:            NIGHT_INK,
  surface:       '#1A1C27',
  surfaceAlt:    '#22253A',
  border:        '#2A2D3E',
  borderMid:     '#373B54',

  text:          '#FFFFFF',
  muted:         '#8A8A9A',
  faint:         '#454560',

  primary:       UNLOCK_LIME,   // CTA buttons on dark
  primaryText:   NIGHT_INK,
  blue:          ROUTE_BLUE,    // secondary action on dark
  blueText:      '#FFFFFF',
  coral:         SIGNAL_CORAL,

  errorBg:       '#2D1215',
  errorBorder:   '#5C2028',
  errorText:     SIGNAL_CORAL,

  successBg:     '#0F1F0A',
  successBorder: '#2A5C1A',
  successText:   UNLOCK_LIME,
}

// ── Typography helpers ───────────────────────────────────────────────────────
// Inter is loaded via premium.css. Use these weight constants for inline styles.
export const WEIGHT = {
  black:       900,   // display headlines — always uppercase
  extraBold:   800,   // section headers
  semiBold:    600,   // UI labels, buttons
  regular:     400,   // body, descriptions
}

// ── Shared component style builders ─────────────────────────────────────────
// Call as functions so they work with inline styles (no className required).

export function btnPrimary(overrides = {}) {
  return {
    display:       'block',
    width:         '100%',
    padding:       '16px 24px',
    background:    ROUTE_BLUE,
    color:         '#FFFFFF',
    border:        'none',
    borderRadius:  '100px',    // fully pill-shaped, per UI concept
    fontSize:      '15px',
    fontWeight:    WEIGHT.semiBold,
    letterSpacing: '.04em',
    textTransform: 'uppercase',
    cursor:        'pointer',
    textAlign:     'center',
    ...overrides,
  }
}

export function btnLime(overrides = {}) {
  return {
    ...btnPrimary(),
    background:  UNLOCK_LIME,
    color:       NIGHT_INK,
    ...overrides,
  }
}

export function btnOutline(overrides = {}) {
  return {
    ...btnPrimary(),
    background:  'transparent',
    color:       NIGHT_INK,
    border:      `1.5px solid ${NIGHT_INK}`,
    ...overrides,
  }
}

export function btnOutlineDark(overrides = {}) {
  return {
    ...btnPrimary(),
    background:  'transparent',
    color:       '#FFFFFF',
    border:      `1.5px solid #FFFFFF`,
    ...overrides,
  }
}

export function inputField(overrides = {}) {
  return {
    width:          '100%',
    background:     '#FFFFFF',
    border:         `1.5px solid ${L.border}`,
    borderRadius:   '12px',
    padding:        '16px',
    color:          NIGHT_INK,
    fontSize:       '16px',
    fontFamily:     'Inter, -apple-system, sans-serif',
    fontWeight:     WEIGHT.regular,
    boxSizing:      'border-box',
    outline:        'none',
    ...overrides,
  }
}

export function label(overrides = {}) {
  return {
    display:       'block',
    fontSize:      '11px',
    fontWeight:    WEIGHT.semiBold,
    color:         L.muted,
    letterSpacing: '.08em',
    textTransform: 'uppercase',
    marginBottom:  '8px',
    ...overrides,
  }
}

export function eyebrow(color = ROUTE_BLUE, overrides = {}) {
  return {
    fontSize:      '11px',
    fontWeight:    WEIGHT.semiBold,
    color,
    letterSpacing: '.1em',
    textTransform: 'uppercase',
    margin:        '0 0 6px',
    ...overrides,
  }
}