// generate-qr.mjs
// Generates print-ready QR codes for any adventure's registration link
// plus one per checkpoint, pulled live from Supabase (no hardcoded list
// to keep in sync — works for every adventure, including new ones
// created through the admin wizard).
//
// Setup (run once):
//   npm install qrcode
//
// Credentials: needs SUPABASE_URL and SUPABASE_ANON_KEY as environment
// variables. Easiest options:
//   1. Node 20.6+:  node --env-file=.env generate-qr.mjs ...
//   2. Or just export them in your shell first:
//        export SUPABASE_URL=https://your-project.supabase.co
//        export SUPABASE_ANON_KEY=your-anon-key
//   3. Or this script will also auto-read a local .env file in the
//      project root if one exists (no flag needed).
//
// Run:
//   node generate-qr.mjs https://your-app.netlify.app tideline-survey
//
// Output: ./qr-codes/<adventure-slug>/ folder with one PNG per checkpoint
// plus 00-start.png (the registration / landing page QR).

import QRCode from 'qrcode'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Minimal .env fallback loader — only fills in vars that aren't already set ──
function loadDotEnvFallback() {
  const envPath = path.join(__dirname, '.env')
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

loadDotEnvFallback()

// ── Fixed Base URL Parsing Logic — Strips trailing slashes to guarantee correct path patterns ──
const BASE_URL       = process.argv[2] ? process.argv[2].replace(/\/$/, '') : null
const ADVENTURE_SLUG = process.argv[3]

const SUPABASE_URL   = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY   = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!BASE_URL || !ADVENTURE_SLUG) {
  console.error('Usage: node generate-qr.mjs <app-url> <adventure-slug>')
  console.error('Example: node generate-qr.mjs https://your-app.netlify.app tideline-survey')
  process.exit(1)
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials.')
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY as environment variables, or add a .env file in this folder containing them.')
  process.exit(1)
}

async function supabaseGet(pathAndQuery) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + pathAndQuery, {
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
  })
  if (!res.ok) throw new Error(`Supabase request failed: ${res.status} ${await res.text()}`)
  return res.json()}

// ── Look up the adventure ──
const adventures = await supabaseGet(`adventures?select=id,name&slug=eq.${ADVENTURE_SLUG}`)
const adventure = adventures[0]

if (!adventure) {
  console.error(`No adventure found with slug "${ADVENTURE_SLUG}". Check it's spelled exactly as created in the wizard.`)
  process.exit(1)
}

// ── Fetch its checkpoints, in order ──
const checkpoints = await supabaseGet(
  `checkpoints?select=sequence,slug,story_snippet&adventure_id=eq.${adventure.id}&order=sequence`
)

if (checkpoints.length === 0) {
  console.error(`"${adventure.name}" has no checkpoints yet — has it been created via the wizard?`)
  process.exit(1)
}

const outputDir = path.join(__dirname, 'qr-codes', ADVENTURE_SLUG)
fs.mkdirSync(outputDir, { recursive: true })

console.log(`Generating QR codes for: ${adventure.name}`)
console.log(`Base URL: ${BASE_URL}`)
console.log('')

const qrOptions = {
  width: 600,
  margin: 2,
  errorCorrectionLevel: 'H',
  color: { dark: '#000000', light: '#FFFFFF' },
}

// ── Registration / Start QR — points at the landing page, not /register
//    directly. This also doubles as a built-in "resume" QR: scanning it
//    again on the same device drops a returning player straight back
//    into their current checkpoint instead of re-registering. ──
const regUrl  = `${BASE_URL}/?adventure=${ADVENTURE_SLUG}`
const regFile = path.join(outputDir, '00-start.png')
await QRCode.toFile(regFile, regUrl, qrOptions)

console.log('✓ START — Registration / Landing Page')
console.log('  URL  : ' + regUrl)
console.log('  File : qr-codes/' + ADVENTURE_SLUG + '/00-start.png')
console.log('')

// ── One QR per checkpoint — optional physical signage at each site ──
for (const cp of checkpoints) {
  const url     = `${BASE_URL}/c/${cp.slug}`
  const outFile = path.join(outputDir, `${String(cp.sequence).padStart(2, '0')}-${cp.slug}.png`)
  const snippet = (cp.story_snippet || '').slice(0, 60).trim()
  
  await QRCode.toFile(outFile, url, qrOptions)
  
  console.log(`✓ CP${cp.sequence} — ${cp.slug}`)
  if (snippet) console.log(`  Story: "${snippet}${cp.story_snippet.length > 60 ? '...' : ''}"`)
  console.log('  URL  : ' + url)
  console.log('  File : qr-codes/' + ADVENTURE_SLUG + '/' + path.basename(outFile))
  console.log('')
}

console.log(`Done. ${checkpoints.length + 1} QR codes saved in ./qr-codes/${ADVENTURE_SLUG}/`)
console.log('Print at 10x10cm minimum for easy scanning.')
console.log('')
console.log('00-start.png is the one to put up first — at the registration point / first checkpoint location.')
console.log('The rest are optional physical markers at each checkpoint site.')