/**
 * Orchestrazione: prende i prodotti dall'archivio, li fa controllare,
 * scrive i risultati. Nessuna dipendenza da Express: la usano sia il server
 * che `npm run controlla`.
 */
import { leggi, scrivi, backup, registraPrezzo } from './archivio.js'
import { controllaUno, controllaLista } from './scraper/controlla.js'

let inCorso = false
export const controlloInCorso = () => inCorso

/**
 * @param {object} opzioni
 * @param {string} [opzioni.id] controlla un solo prodotto
 * @param {function} [opzioni.onRiga] per stampare l'avanzamento
 */
export async function eseguiControllo({ id = null, onRiga = null } = {}) {
  if (inCorso) return { saltato: true, motivo: 'un controllo è già in corso' }
  inCorso = true
  try {
    const dati = await leggi()
    const candidati = dati.prodotti.filter(p =>
      p.url && !p.archiviato && (!id || p.id === id))

    if (!candidati.length) {
      return { controllati: 0, aggiornati: 0, esiti: [] }
    }
    if (candidati.length > 1) await backup('prima-controllo')

    let aggiornati = 0
    const adesso = () => new Date().toISOString()

    const applica = (prodotto, esito) => {
      prodotto.ultimoControllo = adesso()
      prodotto.statoUltimoControllo = esito.stato
      if (esito.stato === 'ok') {
        prodotto.manuale = false
        if (registraPrezzo(prodotto, esito.prezzo, 'auto', prodotto.ultimoControllo)) aggiornati++
        if (!prodotto.immagine && esito.immagine) prodotto.immagine = esito.immagine
      }
      onRiga?.(prodotto, esito)
    }

    const esiti = await controllaLista(candidati, {
      onEsito: async (esito, prodotto) => {
        applica(prodotto, esito)
        await scrivi(dati)   // salva dopo ogni prodotto: un'interruzione non perde niente
      }
    })

    return { controllati: candidati.length, aggiornati, esiti }
  } finally {
    inCorso = false
  }
}

export { controllaUno }
