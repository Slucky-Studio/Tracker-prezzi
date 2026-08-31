/** Tutte le chiamate al server in un posto solo. Ogni errore torna leggibile. */

async function chiama(percorso, opzioni = {}) {
  let risposta
  try {
    risposta = await fetch(percorso, {
      headers: { 'Content-Type': 'application/json' },
      ...opzioni,
      body: opzioni.corpo ? JSON.stringify(opzioni.corpo) : undefined
    })
  } catch {
    throw new Error('Il server non risponde. Controlla che Soglia sia acceso.')
  }
  const testo = await risposta.text()
  let dati = null
  try { dati = testo ? JSON.parse(testo) : null } catch {}
  if (!risposta.ok) throw new Error(dati?.errore || 'Richiesta non riuscita.')
  return dati
}

export const api = {
  stato: () => chiama('/api/stato'),

  creaProdotto: (campi) => chiama('/api/prodotti', { method: 'POST', corpo: campi }),
  aggiornaProdotto: (id, campi) => chiama(`/api/prodotti/${id}`, { method: 'PATCH', corpo: campi }),
  eliminaProdotto: (id) => chiama(`/api/prodotti/${id}`, { method: 'DELETE' }),

  aggiungiPrezzo: (id, prezzo, data) =>
    chiama(`/api/prodotti/${id}/rilevazione`, { method: 'POST', corpo: { prezzo, data } }),
  togliRilevazione: (id, indice) =>
    chiama(`/api/prodotti/${id}/rilevazione/${indice}`, { method: 'DELETE' }),

  controlla: (id) => chiama(`/api/prodotti/${id}/controlla`, { method: 'POST' }),
  controllaTutti: () => chiama('/api/controlla', { method: 'POST' }),

  impostazioni: (campi) => chiama('/api/impostazioni', { method: 'PATCH', corpo: campi }),
  importa: (dati, modalita) => chiama('/api/importa', { method: 'POST', corpo: { dati, modalita } }),
  backup: () => chiama('/api/backup')
}

/** Percorso immagine dal JSON alla pagina. */
export function urlImmagine(percorso) {
  if (!percorso) return null
  if (/^(https?:)?\/\//.test(percorso) || percorso.startsWith('/')) return percorso
  return `/${percorso}`
}
