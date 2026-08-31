/**
 * Copia in web/public/ocr/ i file di tesseract.js già presenti in node_modules,
 * così l'OCR non li scarica da una CDN a ogni avvio.
 * Gira da solo prima di `vite build` e di `vite dev`.
 *
 * Copia anche il modello italiano (ita.traineddata.gz), così l'OCR è
 * completamente offline: zero chiamate di rete, zero CDN.
 * Se un file manca, l'OCR non si rompe: ripiega sulla rete e, se non c'è
 * nemmeno quella, il campo resta vuoto e l'immagine si salva lo stesso.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = path.dirname(fileURLToPath(import.meta.url))
const DESTINAZIONE = path.join(QUI, 'public', 'ocr')

const DA_COPIARE = [
  ['tesseract.js', 'dist/worker.min.js'],
  ['tesseract.js-core', 'tesseract-core-lstm.wasm.js'],
  ['tesseract.js-core', 'tesseract-core-lstm.wasm'],
  ['tesseract.js-core', 'tesseract-core-simd-lstm.wasm.js'],
  ['tesseract.js-core', 'tesseract-core-simd-lstm.wasm'],
  ['@tesseract.js-data/ita', '4.0.0/ita.traineddata.gz']
]

function trova(pacchetto, file) {
  const candidati = [
    path.join(QUI, 'node_modules', pacchetto, file),
    path.join(QUI, '..', 'node_modules', pacchetto, file)
  ]
  return candidati.find(c => fs.existsSync(c)) || null
}

fs.mkdirSync(DESTINAZIONE, { recursive: true })
let copiati = 0
for (const [pacchetto, file] of DA_COPIARE) {
  const sorgente = trova(pacchetto, file)
  if (!sorgente) continue
  const arrivo = path.join(DESTINAZIONE, path.basename(file))
  if (!fs.existsSync(arrivo) || fs.statSync(sorgente).size !== fs.statSync(arrivo).size) {
    fs.copyFileSync(sorgente, arrivo)
  }
  copiati++
}

// senza questi file l'OCR non si rompe: ripiega sulla rete.
if (copiati < DA_COPIARE.length) {
  console.log(`ocr: ${copiati}/${DA_COPIARE.length} file copiati in public/ocr — il resto arriva dalla rete.`)
}
