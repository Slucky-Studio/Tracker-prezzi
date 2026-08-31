/**
 * Da "1.299,00 €" (o "€ 1.299", "1 299,00", "$1,299.00", "1299") a un numero.
 * Gestisce il formato italiano e quello inverso senza indovinare a caso:
 * quando ci sono entrambi i separatori, l'ultimo è il decimale.
 */

const VALUTE = [
  { segno: /€|\bEUR\b|\beuro\b/i, codice: 'EUR' },
  { segno: /£|\bGBP\b/i, codice: 'GBP' },
  { segno: /\bCHF\b|\bFr\.?\b/i, codice: 'CHF' },
  { segno: /\$|\bUSD\b/i, codice: 'USD' }
]

// numeri con separatori di migliaia (punto, virgola, spazio anche unificatore)
const NUMERO = /\d{1,3}(?:[.,\s  ']\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?/g

export function riconosciValuta(testo = '') {
  for (const v of VALUTE) if (v.segno.test(testo)) return v.codice
  return null
}

/** Converte una singola stringa numerica in Number, o null. */
export function aNumero(grezzo) {
  if (grezzo === null || grezzo === undefined) return null
  if (typeof grezzo === 'number') return Number.isFinite(grezzo) ? grezzo : null

  let s = String(grezzo).trim().replace(/[\s  ']/g, '')
  if (!s) return null
  s = s.replace(/[^\d.,-]/g, '')
  if (!/\d/.test(s)) return null

  const ultimaVirgola = s.lastIndexOf(',')
  const ultimoPunto = s.lastIndexOf('.')

  let decimale = null
  if (ultimaVirgola >= 0 && ultimoPunto >= 0) {
    decimale = ultimaVirgola > ultimoPunto ? ',' : '.'
  } else if (ultimaVirgola >= 0 || ultimoPunto >= 0) {
    const sep = ultimaVirgola >= 0 ? ',' : '.'
    const posizione = Math.max(ultimaVirgola, ultimoPunto)
    const cifreDopo = s.length - posizione - 1
    const occorrenze = s.split(sep).length - 1
    // un solo separatore con 1 o 2 cifre dopo = decimale; con 3 cifre = migliaia
    decimale = (occorrenze === 1 && cifreDopo !== 3) ? sep : null
  }

  if (decimale === ',') s = s.replace(/\./g, '').replace(',', '.')
  else if (decimale === '.') s = s.replace(/,/g, '')
  else s = s.replace(/[.,]/g, '')

  const n = Number(s)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100) / 100
}

/**
 * Cerca un prezzo dentro un testo qualsiasi e lo normalizza.
 * Ritorna { prezzo, valuta } oppure null.
 */
export function estraiPrezzoDaTesto(testo, { minimo = 0.5, massimo = 1e7 } = {}) {
  if (!testo) return null
  const pulito = String(testo).replace(/−/g, '-')
  const trovati = pulito.match(NUMERO)
  if (!trovati) return null

  for (const grezzo of trovati) {
    const n = aNumero(grezzo)
    if (n !== null && n >= minimo && n <= massimo) {
      return { prezzo: n, valuta: riconosciValuta(pulito) }
    }
  }
  return null
}

export const _perTest = { NUMERO }
