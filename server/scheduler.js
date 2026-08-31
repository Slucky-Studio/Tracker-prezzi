/**
 * Il controllo automatico. node-cron nel server: gira da solo, anche se
 * l'app non è aperta in nessun browser (basta che il processo resti acceso).
 */
import cron from 'node-cron'
import { leggi } from './archivio.js'
import { eseguiControllo } from './controllo.js'

const ESPRESSIONI = {
  giornaliero: '0 8 * * *',       // ogni giorno alle 08:00
  '12h': '0 8,20 * * *',
  '6h': '0 2,8,14,20 * * *'
}

const ORE = { giornaliero: 24, '12h': 12, '6h': 6 }

let attivo = null
let frequenzaAttiva = null

export async function avviaScheduler({ subitoSeVecchio = true } = {}) {
  await riprogramma()
  if (subitoSeVecchio) {
    // all'avvio, se l'ultimo controllo è più vecchio dell'intervallo, ne fa uno.
    setTimeout(() => { controllaSeServe().catch(() => {}) }, 4000)
  }
}

export async function riprogramma() {
  const { impostazioni } = await leggi()
  const frequenza = impostazioni.frequenzaControllo
  if (frequenza === frequenzaAttiva) return frequenza

  if (attivo) { attivo.stop(); attivo = null }
  frequenzaAttiva = frequenza

  const espressione = ESPRESSIONI[frequenza]
  if (!espressione) {
    console.log('  controllo automatico   spento (solo manuale)')
    return frequenza
  }

  attivo = cron.schedule(espressione, () => {
    eseguiControllo({ onRiga: stampa }).then(riassunto => {
      if (riassunto?.controllati) {
        console.log(`  controllo automatico: ${riassunto.controllati} controllati, ${riassunto.aggiornati} cambiati`)
      }
    }).catch(e => console.error('  controllo automatico non riuscito:', e.message))
  })
  console.log(`  controllo automatico   ${descrivi(frequenza)}`)
  return frequenza
}

export async function controllaSeServe() {
  const dati = await leggi()
  const ore = ORE[dati.impostazioni.frequenzaControllo]
  if (!ore) return null

  const seguiti = dati.prodotti.filter(p => p.url && !p.archiviato)
  if (!seguiti.length) return null

  const controlli = seguiti.map(p => p.ultimoControllo ? new Date(p.ultimoControllo).getTime() : 0)
  const piuRecente = Math.max(...controlli)
  if (Date.now() - piuRecente < ore * 3600e3) return null

  console.log('  ultimo controllo vecchio: ne faccio uno adesso.')
  return eseguiControllo({ onRiga: stampa })
}

function stampa(prodotto, esito) {
  const stato = esito.stato === 'ok' ? `${esito.prezzo}` : `${esito.stato} — ${esito.motivo}`
  console.log(`    ${prodotto.nome.slice(0, 44).padEnd(46)} ${stato}`)
}

export function descrivi(frequenza) {
  return {
    giornaliero: 'ogni giorno alle 08:00',
    '12h': 'ogni 12 ore (08:00 e 20:00)',
    '6h': 'ogni 6 ore',
    manuale: 'spento (solo manuale)'
  }[frequenza] || frequenza
}
