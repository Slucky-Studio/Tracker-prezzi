/**
 * Il controllo dei prezzi, senza Express e senza archivio: solo rete + cascata.
 * Coda seriale con 3-6 secondi di pausa: mai richieste parallele a raffica.
 */
import { scarica, attendi } from './scarica.js'
import { estrai } from './estrai.js'

export const PAUSA_MIN = 3000
export const PAUSA_MAX = 6000

/** Controlla un singolo prodotto. Ritorna sempre un esito, mai un'eccezione. */
export async function controllaUno(prodotto) {
  if (!prodotto?.url) {
    return { id: prodotto?.id, stato: 'fallito', motivo: 'nessun link da controllare' }
  }
  const scaricata = await scarica(prodotto.url)
  if (!scaricata.ok) {
    return { id: prodotto.id, stato: scaricata.stato, motivo: scaricata.motivo }
  }

  const letto = estrai(scaricata.html, scaricata.urlFinale || prodotto.url)
  if (letto.prezzo === null) {
    return { id: prodotto.id, stato: 'fallito', motivo: 'prezzo non trovato nella pagina', letto }
  }
  return {
    id: prodotto.id,
    stato: 'ok',
    prezzo: letto.prezzo,
    valuta: letto.valuta,
    nome: letto.nome,
    immagine: letto.immagine,
    fonte: letto.fonte
  }
}

/**
 * Controlla una lista in coda seriale.
 * onEsito viene chiamato dopo ogni prodotto, così chi chiama può salvare subito.
 */
export async function controllaLista(prodotti, { onEsito, pausaMin = PAUSA_MIN, pausaMax = PAUSA_MAX } = {}) {
  const esiti = []
  for (let i = 0; i < prodotti.length; i++) {
    const esito = await controllaUno(prodotti[i])
    esiti.push(esito)
    if (onEsito) await onEsito(esito, prodotti[i])
    if (i < prodotti.length - 1) {
      await attendi(pausaMin + Math.random() * (pausaMax - pausaMin))
    }
  }
  return esiti
}
