#!/usr/bin/env node
/**
 * Controllo dei prezzi da riga di comando:  npm run controlla
 * Stessa logica dello scheduler, senza avviare il server.
 */
import { eseguiControllo } from './controllo.js'
import { FILE_DATI } from './archivio.js'

const esito = await eseguiControllo({
  onRiga: (prodotto, r) => {
    const stato = r.stato === 'ok'
      ? `${r.prezzo} ${r.valuta || ''}`.trim()
      : `${r.stato} — ${r.motivo}`
    console.log(`  ${prodotto.nome.slice(0, 48).padEnd(50)} ${stato}`)
  }
})

if (esito.saltato) {
  console.log(`Controllo saltato: ${esito.motivo}`)
} else if (esito.controllati === 0) {
  console.log('Nessun prodotto con link da controllare.')
} else {
  console.log('')
  console.log(`Controllati ${esito.controllati}, prezzi cambiati ${esito.aggiornati}.`)
  console.log(`Archivio: ${FILE_DATI}`)
}
