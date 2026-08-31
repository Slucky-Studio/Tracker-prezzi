/**
 * Il verdetto è la ragione per cui l'app esiste.
 * Si calcola dalla posizione del prezzo di oggi dentro il range storico.
 *
 *   nel 20% più basso mai visto → minimo storico
 *   sotto (o pari a) la mediana → buon momento
 *   sopra la mediana            → caro
 *   meno di 3 rilevazioni       → pochi dati, e nessun giudizio
 */

export const VERDETTI = {
  minimo: { testo: 'minimo storico', acceso: true },
  buono:  { testo: 'buon momento',   acceso: false },
  caro:   { testo: 'caro',           acceso: false },
  pochi:  { testo: 'pochi dati',     acceso: false }
}

function mediana(numeri) {
  const s = [...numeri].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/** Analisi completa di un prodotto: numeri + verdetto + posizione sulla fascia. */
export function analizza(prodotto) {
  const storico = [...(prodotto?.storico || [])]
    .filter(p => typeof p.prezzo === 'number' && !Number.isNaN(p.prezzo))
    .sort((a, b) => new Date(a.data) - new Date(b.data))

  const prezzi = storico.map(p => p.prezzo)
  const rilevazioni = prezzi.length

  if (rilevazioni === 0) {
    return {
      rilevazioni: 0, prezzo: null, min: null, max: null, media: null,
      posizione: 0.5, verdetto: 'pochi', variazione: null, storico
    }
  }

  const prezzo = prezzi[prezzi.length - 1]
  const min = Math.min(...prezzi)
  const max = Math.max(...prezzi)
  const media = prezzi.reduce((a, b) => a + b, 0) / rilevazioni
  const escursione = max - min
  const posizione = escursione > 0 ? (prezzo - min) / escursione : 0.5
  const primo = prezzi[0]
  const variazione = primo > 0 ? ((prezzo - primo) / primo) * 100 : null

  let verdetto
  if (rilevazioni < 3 || escursione === 0) verdetto = 'pochi'
  else if (posizione <= 0.2) verdetto = 'minimo'
  else verdetto = prezzo <= mediana(prezzi) ? 'buono' : 'caro'

  return {
    rilevazioni, prezzo, min, max, media, mediana: mediana(prezzi),
    posizione, verdetto, variazione, escursione, storico,
    ultimaData: storico[storico.length - 1]?.data || null
  }
}

/** Posizione 0..1 del prezzo obiettivo dentro il range, o null se non serve. */
export function posizioneObiettivo(analisi, obiettivo) {
  if (typeof obiettivo !== 'number' || !analisi || analisi.min === null) return null
  if (!analisi.escursione) return 0.5
  return Math.min(1, Math.max(0, (obiettivo - analisi.min) / analisi.escursione))
}

/** Ordinamento per convenienza: prima i minimi storici, poi la posizione più bassa. */
export function punteggioConvenienza(analisi) {
  if (!analisi || analisi.rilevazioni === 0) return 2
  if (analisi.verdetto === 'pochi') return 1 + analisi.posizione * 0.001
  return analisi.posizione
}
