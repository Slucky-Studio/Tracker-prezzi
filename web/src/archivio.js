/**
 * L'archivio: vive solo nel telefono, in IndexedDB. Nessun server, nessun
 * account. Due magazzini: "stato" (il JSON con prodotti e impostazioni) e
 * "immagini" (i file, tenuti separati perché non ballino nel JSON principale).
 *
 * Le funzioni qui dentro sono la stessa forma di una API — creaProdotto,
 * aggiornaProdotto, ecc. — ma sincrone col dispositivo, non con una rete.
 */
import { useEffect, useState } from 'react'

export const VERSIONE_SCHEMA = 2
const DB_NOME = 'soglia'
const DB_VERSIONE = 1
const CHIAVE_STATO = 'archivio'

export const IMPOSTAZIONI_DEFAULT = { valuta: 'EUR', sfondo: 'notturno' }

export function archivioVuoto() {
  return { versione: VERSIONE_SCHEMA, impostazioni: { ...IMPOSTAZIONI_DEFAULT }, prodotti: [] }
}

/* ------------------------------------------------------------------
   IndexedDB, in piccolo: apertura e le operazioni che servono.
   ------------------------------------------------------------------ */

let dbPromessa = null

function apriDB() {
  if (dbPromessa) return dbPromessa
  dbPromessa = new Promise((risolvi, rifiuta) => {
    const richiesta = indexedDB.open(DB_NOME, DB_VERSIONE)
    richiesta.onupgradeneeded = () => {
      const db = richiesta.result
      if (!db.objectStoreNames.contains('stato')) db.createObjectStore('stato')
      if (!db.objectStoreNames.contains('immagini')) db.createObjectStore('immagini')
    }
    richiesta.onsuccess = () => risolvi(richiesta.result)
    richiesta.onerror = () => rifiuta(richiesta.error)
  })
  return dbPromessa
}

function operazione(magazzino, modo, fn) {
  return apriDB().then(db => new Promise((risolvi, rifiuta) => {
    const tx = db.transaction(magazzino, modo)
    const risultato = fn(tx.objectStore(magazzino))
    tx.oncomplete = () => risolvi(risultato?.result)
    tx.onerror = () => rifiuta(tx.error)
    tx.onabort = () => rifiuta(tx.error || new Error('operazione interrotta'))
  }))
}

/* ------------------------------------------------------------------
   Migrazione. Un salto per versione, così un export vecchio non si
   rompe mai all'importazione.
   ------------------------------------------------------------------ */

const MIGRAZIONI = {
  // 0/1 → 2: schema server (con scraping) diventa schema locale.
  //   manuale, ultimoControllo, statoUltimoControllo non hanno più senso
  //   senza controllo automatico: si tolgono, il resto resta.
  0: (dati) => ({ ...dati, versione: 2 }),
  1: (dati) => ({ ...dati, versione: 2 })
}

export function migra(dati) {
  let d = { ...(dati || {}) }
  let v = Number(d.versione) || 0
  while (v < VERSIONE_SCHEMA) {
    const salto = MIGRAZIONI[v]
    if (!salto) { d.versione = VERSIONE_SCHEMA; break }
    d = salto(d)
    v = Number(d.versione) || v + 1
  }
  d.impostazioni = { ...IMPOSTAZIONI_DEFAULT, ...(d.impostazioni || {}) }
  d.prodotti = (d.prodotti || []).map(normalizzaProdotto)
  d.versione = VERSIONE_SCHEMA
  return d
}

function idCasuale() {
  return (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`)
}

export function normalizzaProdotto(p = {}) {
  const storico = (Array.isArray(p.storico) ? p.storico : [])
    .filter(r => r && typeof r.prezzo === 'number' && Number.isFinite(r.prezzo))
    .map(r => ({ data: r.data || new Date().toISOString(), prezzo: Number(r.prezzo), fonte: r.fonte || 'manuale' }))
    .sort((a, b) => new Date(a.data) - new Date(b.data))

  return {
    id: p.id || idCasuale(),
    nome: (p.nome || 'Senza nome').toString().slice(0, 300),
    url: p.url || null,
    immagine: p.immagine || null,
    note: p.note || '',
    tag: Array.isArray(p.tag) ? p.tag.filter(t => typeof t === 'string').slice(0, 12) : [],
    prezzoObiettivo: typeof p.prezzoObiettivo === 'number' && Number.isFinite(p.prezzoObiettivo)
      ? p.prezzoObiettivo : null,
    archiviato: !!p.archiviato,
    creatoIl: p.creatoIl || new Date().toISOString(),
    storico
  }
}

/* ------------------------------------------------------------------
   Lettura e scrittura dello stato
   ------------------------------------------------------------------ */

export async function leggi() {
  const grezzo = await operazione('stato', 'readonly', s => s.get(CHIAVE_STATO))
  if (!grezzo) {
    const vuoto = archivioVuoto()
    await scrivi(vuoto)
    return vuoto
  }
  return migra(grezzo)
}

export async function scrivi(dati) {
  const completo = { ...dati, versione: VERSIONE_SCHEMA }
  await operazione('stato', 'readwrite', s => s.put(completo, CHIAVE_STATO))
  return completo
}

async function modifica(fn) {
  const dati = await leggi()
  const nuovo = (await fn(dati)) || dati
  return scrivi(nuovo)
}

/* ------------------------------------------------------------------
   Immagini: ridotte prima di salvarle, tenute come Blob in IndexedDB.
   Il prodotto porta solo un riferimento "img:<id>".
   ------------------------------------------------------------------ */

const RIF_IMMAGINE = /^img:/

const cacheURL = new Map()

/** Da un data URL o un File a un riferimento "img:<id>", ridimensionando prima. */
export async function salvaImmagine(sorgente) {
  const blob = await ridimensiona(sorgente)
  if (!blob) return null
  const id = idCasuale()
  await operazione('immagini', 'readwrite', s => s.put(blob, id))
  return `img:${id}`
}

export async function eliminaImmagine(rif) {
  if (!rif || !RIF_IMMAGINE.test(rif)) return
  const id = rif.slice(4)
  const url = cacheURL.get(rif)
  if (url) { URL.revokeObjectURL(url); cacheURL.delete(rif) }
  await operazione('immagini', 'readwrite', s => s.delete(id))
}

async function leggiBlobImmagine(rif) {
  if (!rif || !RIF_IMMAGINE.test(rif)) return null
  return operazione('immagini', 'readonly', s => s.get(rif.slice(4)))
}

/** Hook: risolve un riferimento "img:<id>" in un URL utilizzabile in <img src>. */
export function useImmagine(rif) {
  const [url, setUrl] = useState(() => (rif && !RIF_IMMAGINE.test(rif) ? rif : null))

  useEffect(() => {
    let annullato = false
    if (!rif) { setUrl(null); return }
    if (!RIF_IMMAGINE.test(rif)) { setUrl(rif); return }   // data URL diretto (export non ancora importato)
    if (cacheURL.has(rif)) { setUrl(cacheURL.get(rif)); return }

    leggiBlobImmagine(rif).then(blob => {
      if (annullato || !blob) return
      const oggetto = URL.createObjectURL(blob)
      cacheURL.set(rif, oggetto)
      setUrl(oggetto)
    }).catch(() => {})

    return () => { annullato = true }
  }, [rif])

  return url
}

function ridimensiona(sorgente, { latoMassimo = 640, qualita = 0.75 } = {}) {
  return new Promise((risolvi) => {
    const img = new Image()
    img.onload = () => {
      const scala = Math.min(1, latoMassimo / Math.max(img.width, img.height))
      const larghezza = Math.max(1, Math.round(img.width * scala))
      const altezza = Math.max(1, Math.round(img.height * scala))
      const tela = document.createElement('canvas')
      tela.width = larghezza; tela.height = altezza
      const ctx = tela.getContext('2d')
      ctx.drawImage(img, 0, 0, larghezza, altezza)
      tela.toBlob(b => risolvi(b), 'image/jpeg', qualita)
    }
    img.onerror = () => risolvi(null)
    if (sorgente instanceof Blob) img.src = URL.createObjectURL(sorgente)
    else img.src = sorgente
  })
}

function blobABase64(blob) {
  return new Promise((risolvi, rifiuta) => {
    const lettore = new FileReader()
    lettore.onload = () => risolvi(lettore.result)
    lettore.onerror = () => rifiuta(lettore.error)
    lettore.readAsDataURL(blob)
  })
}

function base64ABlob(dataUrl) {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl || '')
  if (!m) return null
  const bin = atob(m[2])
  const byte = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) byte[i] = bin.charCodeAt(i)
  return new Blob([byte], { type: m[1] })
}

/* ------------------------------------------------------------------
   Un punto nella cronologia si scrive solo se il prezzo è cambiato.
   ------------------------------------------------------------------ */

function registraPrezzo(prodotto, prezzo, fonte = 'manuale', data = new Date().toISOString()) {
  if (typeof prezzo !== 'number' || !Number.isFinite(prezzo)) return false
  const ultimo = prodotto.storico[prodotto.storico.length - 1]
  if (ultimo && Math.abs(ultimo.prezzo - prezzo) < 0.005) return false
  prodotto.storico.push({ data, prezzo: Math.round(prezzo * 100) / 100, fonte })
  prodotto.storico.sort((a, b) => new Date(a.data) - new Date(b.data))
  return true
}

function pulisciUrl(v) {
  if (typeof v !== 'string' || !v.trim()) return null
  try {
    const u = new URL(v.trim())
    return ['http:', 'https:'].includes(u.protocol) ? u.toString() : null
  } catch { return null }
}

function numero(v) {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/* ------------------------------------------------------------------
   L'API che usano le schermate — stessa forma di prima, senza rete.
   ------------------------------------------------------------------ */

export const archivio = {
  stato: () => leggi(),

  async creaProdotto(campi = {}) {
    let immagine = null
    if (campi.immagineDati) immagine = await salvaImmagine(campi.immagineDati)

    const adesso = new Date().toISOString()
    const prezzo = numero(campi.prezzo)
    const prodotto = normalizzaProdotto({
      nome: (campi.nome || '').trim() || 'Senza nome',
      url: pulisciUrl(campi.url),
      immagine,
      note: campi.note || '',
      tag: campi.tag || [],
      prezzoObiettivo: numero(campi.prezzoObiettivo),
      creatoIl: adesso
    })
    if (prezzo !== null) prodotto.storico = [{ data: adesso, prezzo, fonte: 'manuale' }]

    await modifica(dati => { dati.prodotti.unshift(prodotto); return dati })
    return { prodotto }
  },

  async aggiornaProdotto(id, campi = {}) {
    let prodottoAggiornato = null
    await modifica(async dati => {
      const p = dati.prodotti.find(x => x.id === id)
      if (!p) throw new Error('Prodotto non trovato.')
      if (typeof campi.nome === 'string' && campi.nome.trim()) p.nome = campi.nome.trim()
      if ('url' in campi) p.url = pulisciUrl(campi.url)
      if ('note' in campi) p.note = String(campi.note || '')
      if (Array.isArray(campi.tag)) p.tag = campi.tag.filter(t => typeof t === 'string' && t.trim()).map(t => t.trim())
      if ('prezzoObiettivo' in campi) p.prezzoObiettivo = numero(campi.prezzoObiettivo)
      if ('archiviato' in campi) p.archiviato = !!campi.archiviato
      if (campi.immagineDati) {
        const nuova = await salvaImmagine(campi.immagineDati)
        if (nuova) { await eliminaImmagine(p.immagine); p.immagine = nuova }
      }
      prodottoAggiornato = p
      return dati
    })
    return { prodotto: prodottoAggiornato }
  },

  async eliminaProdotto(id) {
    let tolto = null
    await modifica(dati => {
      const i = dati.prodotti.findIndex(p => p.id === id)
      if (i < 0) throw new Error('Prodotto non trovato.')
      tolto = dati.prodotti.splice(i, 1)[0]
      return dati
    })
    if (tolto?.immagine) await eliminaImmagine(tolto.immagine)
    return { eliminato: id }
  },

  async aggiungiPrezzo(id, prezzo, data) {
    const n = numero(prezzo)
    if (n === null) throw new Error('Prezzo non valido.')
    let prodottoAggiornato = null, cambiato = false
    await modifica(dati => {
      const p = dati.prodotti.find(x => x.id === id)
      if (!p) throw new Error('Prodotto non trovato.')
      cambiato = registraPrezzo(p, n, 'manuale', data || new Date().toISOString())
      prodottoAggiornato = p
      return dati
    })
    return { prodotto: prodottoAggiornato, cambiato }
  },

  async togliRilevazione(id, indice) {
    let prodottoAggiornato = null
    await modifica(dati => {
      const p = dati.prodotti.find(x => x.id === id)
      if (!p) throw new Error('Prodotto non trovato.')
      if (indice < 0 || indice >= p.storico.length) throw new Error('Rilevazione non trovata.')
      p.storico.splice(indice, 1)
      prodottoAggiornato = p
      return dati
    })
    return { prodotto: prodottoAggiornato }
  },

  async impostazioni(campi = {}) {
    let impostazioni = null
    await modifica(dati => {
      if (typeof campi.valuta === 'string') dati.impostazioni.valuta = campi.valuta
      if (typeof campi.sfondo === 'string') dati.impostazioni.sfondo = campi.sfondo
      impostazioni = dati.impostazioni
      return dati
    })
    return { impostazioni }
  },

  /** Un unico file JSON, immagini comprese come base64: è il backup completo. */
  async esporta() {
    const dati = await leggi()
    const prodotti = await Promise.all(dati.prodotti.map(async p => {
      if (!p.immagine || !RIF_IMMAGINE.test(p.immagine)) return p
      const blob = await leggiBlobImmagine(p.immagine)
      if (!blob) return { ...p, immagine: null }
      return { ...p, immagine: await blobABase64(blob) }
    }))
    return { ...dati, prodotti }
  },

  async importa(datiGrezzi, modalita = 'unisci') {
    if (!datiGrezzi || typeof datiGrezzi !== 'object' || !Array.isArray(datiGrezzi.prodotti)) {
      throw new Error('Questo file non è un export di Soglia: manca la lista dei prodotti.')
    }
    const arrivo = migra(datiGrezzi)

    // le immagini in base64 tornano ad essere Blob salvati in locale
    for (const p of arrivo.prodotti) {
      if (typeof p.immagine === 'string' && p.immagine.startsWith('data:')) {
        const blob = base64ABlob(p.immagine)
        p.immagine = blob ? await (async () => {
          const id = idCasuale()
          await operazione('immagini', 'readwrite', s => s.put(blob, id))
          return `img:${id}`
        })() : null
      }
    }

    await modifica(dati => {
      if (modalita === 'sostituisci') {
        dati.prodotti = arrivo.prodotti
        dati.impostazioni = { ...dati.impostazioni, ...arrivo.impostazioni }
      } else {
        const perId = new Map(dati.prodotti.map(p => [p.id, p]))
        for (const p of arrivo.prodotti) {
          const esistente = perId.get(p.id)
          if (!esistente) { dati.prodotti.push(p); continue }
          const viste = new Set(esistente.storico.map(r => `${r.data}|${r.prezzo}`))
          for (const r of p.storico) if (!viste.has(`${r.data}|${r.prezzo}`)) esistente.storico.push(r)
          esistente.storico.sort((a, b) => new Date(a.data) - new Date(b.data))
          esistente.prezzoObiettivo = esistente.prezzoObiettivo ?? p.prezzoObiettivo
          esistente.note = esistente.note || p.note
        }
      }
      return dati
    })
    const finale = await leggi()
    return { prodotti: finale.prodotti.length, modalita }
  }
}

/** Fa scaricare l'export come file .json — su iPhone apre il foglio di condivisione/Salva. */
export async function scaricaEsportazione() {
  const dati = await archivio.esporta()
  const testo = JSON.stringify(dati, null, 2)
  const blob = new Blob([testo], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `soglia-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/** Quanto spazio occupa l'archivio sul dispositivo, se il browser lo sa dire. */
export async function stimaSpazio() {
  if (!navigator.storage?.estimate) return null
  try {
    const { usage, quota } = await navigator.storage.estimate()
    return { usage, quota }
  } catch { return null }
}
