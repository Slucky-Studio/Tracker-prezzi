/**
 * OCR nel browser con tesseract.js. Nessuna API, nessuna chiave: il
 * riconoscimento gira qui dentro. È un aiuto, non un requisito — se non
 * riconosce niente il campo resta vuoto e l'immagine si salva lo stesso.
 *
 * I file del motore stanno in /ocr (copiati da node_modules al build).
 * Il modello della lingua, se non è in /ocr, lo scarica il browser una volta
 * sola e poi lo tiene in cache: vedi README.
 */
import { aNumero, riconosciValuta } from '../../../server/scraper/normalizzaPrezzo.js'

const LINGUA = 'ita'
const NUM = "\\d{1,3}(?:[.,\\s' ]\\d{3})*(?:[.,]\\d{1,2})?"
const CON_VALUTA = new RegExp(`(?:€|EUR|\\$|USD|£|GBP)\\s*(${NUM})|(${NUM})\\s*(?:€|EUR|\\$|USD|£|GBP)`, 'gi')
const CON_DECIMALI = new RegExp(`${NUM}[.,]\\d{2}`, 'g')

let motore = null

async function apriMotore(onStato) {
  if (motore) return motore
  const { createWorker } = await import('tesseract.js')

  // prima i file locali, poi il default (rete) se qualcosa manca
  const tentativi = [
    { workerPath: '/ocr/worker.min.js', corePath: '/ocr/', langPath: '/ocr' },
    { workerPath: '/ocr/worker.min.js', corePath: '/ocr/' },
    {}
  ]
  let ultimo = null
  for (const opzioni of tentativi) {
    try {
      motore = await createWorker(LINGUA, 1, {
        ...opzioni,
        logger: (m) => {
          if (m.status === 'recognizing text') onStato?.(`leggo l'immagine… ${Math.round(m.progress * 100)}%`)
          else if (m.status?.includes('loading')) onStato?.('preparo il riconoscimento…')
        }
      })
      return motore
    } catch (e) { ultimo = e }
  }
  throw ultimo || new Error('motore OCR non disponibile')
}

/** Ritorna { prezzo, valuta, testo } oppure null. Non lancia mai. */
export async function leggiPrezzo(dataUrl, { onStato } = {}) {
  try {
    const worker = await apriMotore(onStato)
    const { data } = await worker.recognize(dataUrl, {}, { text: true, blocks: true })
    const testo = data?.text || ''

    // Il prezzo, in uno screenshot, è il numero scritto più grande:
    // così il prezzo barrato non vince sul prezzo di oggi.
    const dalleParole = scegliPrezzoDallaGrafica(data?.blocks)
    if (dalleParole) return { ...dalleParole, testo }

    return { ...scegliPrezzo(testo), testo }
  } catch {
    return null
  }
}

/** Il candidato scritto più in grande, tra quelli che sono prezzi validi. */
export function scegliPrezzoDallaGrafica(blocchi) {
  if (!Array.isArray(blocchi)) return null
  const parole = blocchi
    .flatMap(b => b?.paragraphs || [])
    .flatMap(p => p?.lines || [])
    .flatMap(l => l?.words || [])

  let migliore = null
  for (const parola of parole) {
    const testo = parola?.text || ''
    if (!/\d/.test(testo)) continue
    const n = aNumero(testo.replace(/[^\d.,]/g, ''))
    if (n === null || n < 0.5) continue
    const altezza = (parola?.bbox?.y1 ?? 0) - (parola?.bbox?.y0 ?? 0)
    if (!migliore || altezza > migliore.altezza) migliore = { prezzo: n, altezza }
  }
  if (!migliore || migliore.altezza <= 0) return null
  return { prezzo: migliore.prezzo, valuta: null }
}

/** Dal testo riconosciuto al prezzo più probabile. */
export function scegliPrezzo(testo) {
  if (!testo) return { prezzo: null, valuta: null }

  const conValuta = []
  for (const m of testo.matchAll(CON_VALUTA)) {
    const n = aNumero(m[1] || m[2])
    if (n !== null && n >= 0.5) conValuta.push(n)
  }
  if (conValuta.length) {
    return { prezzo: Math.max(...conValuta), valuta: riconosciValuta(testo) }
  }

  const conDecimali = [...testo.matchAll(CON_DECIMALI)]
    .map(m => aNumero(m[0]))
    .filter(n => n !== null && n >= 0.5)
  if (conDecimali.length) {
    return { prezzo: Math.max(...conDecimali), valuta: riconosciValuta(testo) }
  }

  return { prezzo: null, valuta: riconosciValuta(testo) }
}

export async function chiudiMotore() {
  try { await motore?.terminate() } catch {}
  motore = null
}
