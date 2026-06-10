// generate-qr.mjs
// Generates print-ready QR codes for all 7 checkpoints
//
// Setup (run once):
//   npm install qrcode
//
// Run:
//   node generate-qr.mjs https://your-app.netlify.app
//
// Output: ./qr-codes/ folder with 7 PNG files

import QRCode from 'qrcode'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const BASE_URL = process.argv[2]

if (!BASE_URL) {
  console.error('Error: Please provide your app URL')
  console.error('Usage: node generate-qr.mjs https://your-app.netlify.app')
  process.exit(1)
}

const checkpoints = [
  { slug: 'harbour',    label: 'CP1 — Gansbaai Harbour' },
  { slug: 'coffee-co',  label: 'CP2 — Gansbaai Coffee Company' },
  { slug: 'blue-goose', label: 'CP3 — Blue Goose Restaurant' },
  { slug: 'anchor-ace', label: 'CP4 — Anchor and Ace' },
  { slug: 'bakhuis',    label: 'CP5 — Gansbaai Bakhuis' },
  { slug: 'de-kelders', label: 'CP6 — Coffee On The Rocks' },
  { slug: 'lighthouse', label: 'CP7 — Danger Point Lighthouse' },
]

const outputDir = path.join(__dirname, 'qr-codes')
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir)

console.log('Generating QR codes for:', BASE_URL)
console.log('')

for (const cp of checkpoints) {
  const url     = BASE_URL + '/c/' + cp.slug
  const outFile = path.join(outputDir, cp.slug + '.png')

  await QRCode.toFile(outFile, url, {
    width: 600,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#FFFFFF' },
  })

  console.log('✓ ' + cp.label)
  console.log('  URL  : ' + url)
  console.log('  File : qr-codes/' + cp.slug + '.png')
  console.log('')
}

console.log('Done. Open the qr-codes/ folder to find your PNG files.')
console.log('Print at 10x10cm minimum for easy scanning.')