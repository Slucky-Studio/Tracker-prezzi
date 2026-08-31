/**
 * Soglia — server.
 * Serve l'interfaccia già buildata e le API. Un processo solo, porta 4173,
 * in ascolto su 0.0.0.0 così l'app si apre anche dal telefono.
 */
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import {
  RADICE, CARTELLA_DATI, CARTELLA_BACKUP, FILE_DATI,
  leggi, scrivi, backup, nuovoProdotto, normalizzaProdotto,
  registraPrezzo, validaImport
} from './archivio.js'
import { salvaImmagine, eliminaImmagine } from './immagini.js'
import { scarica } from './scraper/scarica.js'
import { estrai } from './scraper/estrai.js'
import { eseguiControllo, controlloInCorso } from './controllo.js'
import { ipLocale } from './rete.js'

const PORTA = Number(process.env.PORTA || process.env.PORT || 4173)
const DIST = path.join(RADICE, 'web', 'dist')

const app = express()
app.use(express.json({ limit: '12mb' }))

/* ---------------------------- lettura ---------------------------- */

app.get('/api/stato', async (_req, res) => {
  res.json(await leggi())
})

/* --------------------------- prodotti ---------------------------- */

app.post('/api/prodotti', async (req, res) => {
  try {
    const corpo = req.body || {}
    const url = pulisciUrl(corpo.url)

    let immagine = corpo.immagine || null
    if (corpo.immagineDati) immagine = await salvaImmagine(corpo.immagineDati)

    let nome = (corpo.nome || '').trim()
    let prezzo = numero(corpo.prezzo)
    let fonte = prezzo === null ? null : 'manuale'
    let stato = null
    let letto = null

    // Percorso principale: dal link, con la cascata di estrazione.
    if (url) {
      const scaricata = await scarica(url)
      if (scaricata.ok) {
        letto = estrai(scaricata.html, scaricata.urlFinale || url)
        if (!nome && letto.nome) nome = letto.nome
        if (!immagine && letto.immagine) immagine = letto.immagine
        if (prezzo === null && letto.prezzo !== null) { prezzo = letto.prezzo; fonte = 'auto' }
        stato = letto.prezzo === null ? 'fallito' : 'ok'
      } else {
        stato = scaricata.stato
      }
    }

    const prodotto = nuovoProdotto({
      nome: nome || 'Senza nome',
      url,
      immagine,
      note: corpo.note || '',
      tag: corpo.tag || [],
      prezzoObiettivo: numero(corpo.prezzoObiettivo),
      prezzo,
      fonte: fonte || 'manuale',
      manuale: !url || fonte !== 'auto'
    })
    if (url) {
      prodotto.ultimoControllo = new Date().toISOString()
      prodotto.statoUltimoControllo = stato
    }

    const dati = await leggi()
    dati.prodotti.unshift(prodotto)
    await scrivi(dati)
    res.status(201).json({ prodotto, lettura: letto ? letto.fonte : null })
  } catch (e) {
    res.status(400).json({ errore: e.message })
  }
})

/* -------------------- controllo dei prezzi ----------------------- */

app.post('/api/prodotti/:id/controlla', async (req, res) => {
  const esito = await eseguiControllo({ id: req.params.id })
  if (esito.saltato) return res.status(409).json({ errore: 'Un controllo è già in corso.' })
  if (esito.controllati === 0) {
    return res.status(400).json({ errore: 'Questo prodotto non ha un link da controllare.' })
  }
  const dati = await leggi()
  res.json({ prodotto: dati.prodotti.find(p => p.id === req.params.id), esito: esito.esiti[0] })
})

app.post('/api/controlla', async (_req, res) => {
  if (controlloInCorso()) return res.status(409).json({ errore: 'Un controllo è già in corso.' })
  const esito = await eseguiControllo()
  res.json(esito)
})

app.patch('/api/prodotti/:id', async (req, res) => {
  const dati = await leggi()
  const p = dati.prodotti.find(p => p.id === req.params.id)
  if (!p) return res.status(404).json({ errore: 'Prodotto non trovato.' })

  const c = req.body || {}
  if (typeof c.nome === 'string' && c.nome.trim()) p.nome = c.nome.trim()
  if ('url' in c) { p.url = pulisciUrl(c.url); if (!p.url) p.manuale = true }
  if ('note' in c) p.note = String(c.note || '')
  if (Array.isArray(c.tag)) p.tag = c.tag.filter(t => typeof t === 'string' && t.trim()).map(t => t.trim())
  if ('prezzoObiettivo' in c) p.prezzoObiettivo = numero(c.prezzoObiettivo)
  if ('archiviato' in c) p.archiviato = !!c.archiviato
  if (c.immagineDati) {
    const nuova = await salvaImmagine(c.immagineDati)
    if (nuova) { await eliminaImmagine(p.immagine); p.immagine = nuova }
  }

  await scrivi(dati)
  res.json({ prodotto: p })
})

app.delete('/api/prodotti/:id', async (req, res) => {
  const dati = await leggi()
  const i = dati.prodotti.findIndex(p => p.id === req.params.id)
  if (i < 0) return res.status(404).json({ errore: 'Prodotto non trovato.' })
  const [tolto] = dati.prodotti.splice(i, 1)
  await scrivi(dati)
  await eliminaImmagine(tolto.immagine)
  res.json({ eliminato: tolto.id })
})

/** Prezzo aggiunto a mano. */
app.post('/api/prodotti/:id/rilevazione', async (req, res) => {
  const prezzo = numero(req.body?.prezzo)
  if (prezzo === null) return res.status(400).json({ errore: 'Prezzo non valido.' })

  const dati = await leggi()
  const p = dati.prodotti.find(p => p.id === req.params.id)
  if (!p) return res.status(404).json({ errore: 'Prodotto non trovato.' })

  const data = req.body?.data || new Date().toISOString()
  const cambiato = registraPrezzo(p, prezzo, 'manuale', data)
  p.storico.sort((a, b) => new Date(a.data) - new Date(b.data))
  await scrivi(dati)
  res.json({ prodotto: p, cambiato })
})

/** Cancella un punto della cronologia (per correggere un errore di battitura). */
app.delete('/api/prodotti/:id/rilevazione/:indice', async (req, res) => {
  const dati = await leggi()
  const p = dati.prodotti.find(p => p.id === req.params.id)
  if (!p) return res.status(404).json({ errore: 'Prodotto non trovato.' })
  const i = Number(req.params.indice)
  if (!Number.isInteger(i) || i < 0 || i >= p.storico.length) {
    return res.status(400).json({ errore: 'Rilevazione non trovata.' })
  }
  p.storico.splice(i, 1)
  await scrivi(dati)
  res.json({ prodotto: p })
})

/* ------------------------- impostazioni -------------------------- */

app.patch('/api/impostazioni', async (req, res) => {
  const dati = await leggi()
  const c = req.body || {}
  if (typeof c.valuta === 'string') dati.impostazioni.valuta = c.valuta
  if (typeof c.sfondo === 'string') dati.impostazioni.sfondo = c.sfondo
  if (['giornaliero', '12h', '6h', 'manuale'].includes(c.frequenzaControllo)) {
    dati.impostazioni.frequenzaControllo = c.frequenzaControllo
  }
  await scrivi(dati)
  res.json({ impostazioni: dati.impostazioni })
})

/* ---------------------- export e import -------------------------- */

app.get('/api/esporta', async (_req, res) => {
  const dati = await leggi()
  const nome = `soglia-${new Date().toISOString().slice(0, 10)}.json`
  res.setHeader('Content-Disposition', `attachment; filename="${nome}"`)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.send(JSON.stringify(dati, null, 2))
})

app.post('/api/importa', async (req, res) => {
  try {
    const arrivo = validaImport(req.body?.dati)
    const modalita = req.body?.modalita === 'sostituisci' ? 'sostituisci' : 'unisci'
    await backup(`prima-import-${modalita}`)

    const dati = await leggi()
    if (modalita === 'sostituisci') {
      dati.prodotti = arrivo.prodotti
      dati.impostazioni = { ...dati.impostazioni, ...arrivo.impostazioni }
    } else {
      const perId = new Map(dati.prodotti.map(p => [p.id, p]))
      for (const p of arrivo.prodotti) {
        const esistente = perId.get(p.id)
        if (!esistente) { dati.prodotti.push(p); continue }
        // unisci: storico fuso e deduplicato per data
        const viste = new Set(esistente.storico.map(r => `${r.data}|${r.prezzo}`))
        for (const r of p.storico) {
          if (!viste.has(`${r.data}|${r.prezzo}`)) esistente.storico.push(r)
        }
        esistente.storico.sort((a, b) => new Date(a.data) - new Date(b.data))
        esistente.prezzoObiettivo = esistente.prezzoObiettivo ?? p.prezzoObiettivo
        esistente.note = esistente.note || p.note
      }
    }
    dati.prodotti = dati.prodotti.map(normalizzaProdotto)
    await scrivi(dati)
    res.json({ prodotti: dati.prodotti.length, modalita })
  } catch (e) {
    res.status(400).json({ errore: e.message })
  }
})

app.get('/api/backup', async (_req, res) => {
  let file = []
  try {
    file = fs.readdirSync(CARTELLA_BACKUP)
      .filter(f => f.endsWith('.json')).sort().reverse().slice(0, 10)
  } catch {}
  res.json({ cartella: CARTELLA_BACKUP, file, archivio: FILE_DATI })
})

/* --------------------------- statici ----------------------------- */

app.use('/dati/img', express.static(path.join(CARTELLA_DATI, 'img'), { maxAge: '7d' }))

if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, { index: 'index.html' }))
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next()
    res.sendFile(path.join(DIST, 'index.html'))
  })
} else {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.status(503).type('text/plain')
      .send('Interfaccia non ancora costruita. Esegui: npm start')
  })
}

app.use((req, res) => res.status(404).json({ errore: 'Non trovato.' }))

/* ---------------------------- utilità ---------------------------- */

function numero(v) {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function pulisciUrl(v) {
  if (typeof v !== 'string' || !v.trim()) return null
  try {
    const u = new URL(v.trim())
    return ['http:', 'https:'].includes(u.protocol) ? u.toString() : null
  } catch { return null }
}

/* ----------------------------- avvio ----------------------------- */

export function avvia() {
  return app.listen(PORTA, '0.0.0.0', () => {
    const ip = ipLocale()
    console.log('')
    console.log('  Soglia è in ascolto.')
    console.log(`  su questo computer   http://localhost:${PORTA}`)
    if (ip) console.log(`  dal telefono         http://${ip}:${PORTA}`)
    console.log(`  dati                 ${FILE_DATI}`)
    console.log('')
  })
}

if (import.meta.url === `file://${process.argv[1]}`) avvia()

export default app
