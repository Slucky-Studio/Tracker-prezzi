/** Formattazione di valuta e date. Tutto in italiano, numeri tabulari. */

const SIMBOLI = { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF' }

export function simbolo(valuta = 'EUR') {
  return SIMBOLI[valuta] || valuta
}

export function formattaPrezzo(valore, valuta = 'EUR', { decimali = true } = {}) {
  if (valore === null || valore === undefined || Number.isNaN(valore)) return '—'
  try {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: valuta,
      minimumFractionDigits: decimali ? 2 : 0,
      maximumFractionDigits: decimali ? 2 : 0
    }).format(valore)
  } catch {
    return `${simbolo(valuta)} ${valore.toFixed(decimali ? 2 : 0)}`
  }
}

/** Solo il numero, per l'hero: il simbolo lo mettiamo accanto, più piccolo. */
export function formattaNumero(valore, decimali = 2) {
  if (valore === null || valore === undefined || Number.isNaN(valore)) return '—'
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: decimali,
    maximumFractionDigits: decimali
  }).format(valore)
}

export function formattaPercentuale(valore) {
  if (valore === null || valore === undefined || Number.isNaN(valore)) return '—'
  const segno = valore > 0 ? '+' : ''
  return `${segno}${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(valore)}%`
}

export function dataBreve(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: '2-digit' })
}

export function dataEOra(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('it-IT', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}

/** "poco fa", "3 ore fa", "ieri", "12 giorni fa" */
export function quando(iso) {
  if (!iso) return 'mai'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'mai'
  const minuti = Math.round((Date.now() - d.getTime()) / 60000)
  if (minuti < 2) return 'poco fa'
  if (minuti < 60) return `${minuti} min fa`
  const ore = Math.round(minuti / 60)
  if (ore < 24) return `${ore} ${ore === 1 ? 'ora' : 'ore'} fa`
  const giorni = Math.round(ore / 24)
  if (giorni === 1) return 'ieri'
  if (giorni < 30) return `${giorni} giorni fa`
  return dataBreve(iso)
}

/** dominio leggibile di un url, senza www. */
export function dominio(url) {
  if (!url) return ''
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}
