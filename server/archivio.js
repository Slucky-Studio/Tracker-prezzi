/**
 * L'archivio: lettura e scrittura di dati/prodotti.json, backup datati,
 * migrazione dello schema. È l'unico punto che tocca il disco.
 * Nessun database: il file JSON è la fonte di verità.
 */
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const QUI = path.dirname(fileURLToPath(import.meta.url))
export const RADICE = path.resolve(QUI, '..')
export const CARTELLA_DATI = path.join(RADICE, 'dati')
export const FILE_DATI = path.join(CARTELLA_DATI, 'prodotti.json')
export const CARTELLA_BACKUP = path.join(CARTELLA_DATI, 'backup')
export const CARTELLA_IMG = path.join(CARTELLA_DATI, 'img')

export const VERSIONE_SCHEMA = 1
const BACKUP_DA_TENERE = 10

export const IMPOSTAZIONI_DEFAULT = {
  valuta: 'EUR',
  frequenzaControllo: 'giornaliero', // giornaliero | 12h | 6h | manuale
  sfondo: 'notturno'
}

export function archivioVuoto() {
  return { versione: VERSIONE_SCHEMA, impostazioni: { ...IMPOSTAZIONI_DEFAULT }, prodotti: [] }
}

function assicuraCartelle() {
  for (const c of [CARTELLA_DATI, CARTELLA_BACKUP, CARTELLA_IMG]) {
    if (!fs.existsSync(c)) fs.mkdirSync(c, { recursive: true })
  }
}

/* ------------------------------------------------------------------
   Migrazioni. Una funzione per salto di versione: così un export
   vecchio non si rompe mai all'import.
   ------------------------------------------------------------------ */
const MIGRAZIONI = {
  // 0 → 1: primo schema pubblicato. Tiene buono qualunque file precedente.
  0: (dati) => ({
    ...dati,
    versione: 1,
    impostazioni: { ...IMPOSTAZIONI_DEFAULT, ...(dati.impostazioni || {}) },
    prodotti: (dati.prodotti || []).map(normalizzaProdotto)
  })
}

export function migra(dati) {
  let d = { ...dati }
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

/** Riempie i campi mancanti senza inventare niente. */
export function normalizzaProdotto(p = {}) {
  const storico = (Array.isArray(p.storico) ? p.storico : [])
    .filter(r => r && typeof r.prezzo === 'number' && Number.isFinite(r.prezzo))
    .map(r => ({
      data: r.data || new Date().toISOString(),
      prezzo: Number(r.prezzo),
      fonte: r.fonte === 'manuale' ? 'manuale' : 'auto'
    }))
    .sort((a, b) => new Date(a.data) - new Date(b.data))

  return {
    id: p.id || randomUUID(),
    nome: (p.nome || 'Senza nome').toString().slice(0, 300),
    url: p.url || null,
    immagine: p.immagine || null,
    note: p.note || '',
    tag: Array.isArray(p.tag) ? p.tag.filter(t => typeof t === 'string').slice(0, 12) : [],
    prezzoObiettivo: typeof p.prezzoObiettivo === 'number' && Number.isFinite(p.prezzoObiettivo)
      ? p.prezzoObiettivo : null,
    valuta: p.valuta || null,
    manuale: !!p.manuale,
    archiviato: !!p.archiviato,
    creatoIl: p.creatoIl || new Date().toISOString(),
    ultimoControllo: p.ultimoControllo || null,
    statoUltimoControllo: ['ok', 'fallito', 'bloccato'].includes(p.statoUltimoControllo)
      ? p.statoUltimoControllo : (p.ultimoControllo ? 'ok' : null),
    storico
  }
}

/* ------------------------------------------------------------------
   Lettura e scrittura
   ------------------------------------------------------------------ */

export function leggiSincrono() {
  assicuraCartelle()
  if (!fs.existsSync(FILE_DATI)) {
    const vuoto = archivioVuoto()
    fs.writeFileSync(FILE_DATI, JSON.stringify(vuoto, null, 2))
    return vuoto
  }
  try {
    const grezzo = JSON.parse(fs.readFileSync(FILE_DATI, 'utf8'))
    return migra(grezzo)
  } catch (e) {
    // File illeggibile: lo mettiamo da parte invece di sovrascriverlo.
    const salvataggio = path.join(CARTELLA_BACKUP, `illeggibile-${timbro()}.json`)
    try { fs.copyFileSync(FILE_DATI, salvataggio) } catch {}
    console.error(`prodotti.json illeggibile (${e.message}). Copia in ${salvataggio}, riparto da vuoto.`)
    const vuoto = archivioVuoto()
    fs.writeFileSync(FILE_DATI, JSON.stringify(vuoto, null, 2))
    return vuoto
  }
}

export async function leggi() {
  return leggiSincrono()
}

// Le scritture vanno in coda: mai due processi di scrittura sovrapposti.
let coda = Promise.resolve()

export function scrivi(dati) {
  const prossima = coda.then(() => scriviOra(dati)).catch(e => { throw e })
  coda = prossima.catch(() => {})
  return prossima
}

async function scriviOra(dati) {
  assicuraCartelle()
  const completo = { ...dati, versione: VERSIONE_SCHEMA }
  const temporaneo = `${FILE_DATI}.tmp`
  await fsp.writeFile(temporaneo, JSON.stringify(completo, null, 2))
  await fsp.rename(temporaneo, FILE_DATI)   // scrittura atomica
  return completo
}

/** Modifica sicura: leggi, cambia, scrivi. */
export async function modifica(fn) {
  const dati = await leggi()
  const nuovo = await fn(dati)
  return scrivi(nuovo || dati)
}

/* ------------------------------------------------------------------
   Backup datati — le ultime 10 copie
   ------------------------------------------------------------------ */

function timbro() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

export async function backup(etichetta = 'auto') {
  assicuraCartelle()
  if (!fs.existsSync(FILE_DATI)) return null
  const destinazione = path.join(CARTELLA_BACKUP, `prodotti-${timbro()}-${etichetta}.json`)
  await fsp.copyFile(FILE_DATI, destinazione)
  await sfoltisciBackup()
  return destinazione
}

async function sfoltisciBackup() {
  const file = (await fsp.readdir(CARTELLA_BACKUP))
    .filter(f => f.startsWith('prodotti-') && f.endsWith('.json'))
    .sort()
  const troppi = file.slice(0, Math.max(0, file.length - BACKUP_DA_TENERE))
  for (const f of troppi) {
    try { await fsp.unlink(path.join(CARTELLA_BACKUP, f)) } catch {}
  }
}

/* ------------------------------------------------------------------
   Validazione di un file importato
   ------------------------------------------------------------------ */

export function validaImport(dati) {
  if (!dati || typeof dati !== 'object' || Array.isArray(dati)) {
    throw new Error('Il file non contiene un archivio Soglia.')
  }
  if (!Array.isArray(dati.prodotti)) {
    throw new Error('Manca la lista "prodotti": non è un export di Soglia.')
  }
  const rotti = dati.prodotti.filter(p => !p || typeof p !== 'object' || typeof p.nome !== 'string')
  if (rotti.length) {
    throw new Error(`${rotti.length} prodotti senza nome: file incompleto, non lo importo.`)
  }
  return migra(dati)
}

/* ------------------------------------------------------------------
   Prodotti
   ------------------------------------------------------------------ */

export function nuovoProdotto(campi = {}) {
  const adesso = new Date().toISOString()
  const p = normalizzaProdotto({ ...campi, creatoIl: adesso })
  if (typeof campi.prezzo === 'number' && Number.isFinite(campi.prezzo)) {
    p.storico = [{ data: adesso, prezzo: campi.prezzo, fonte: campi.fonte || 'manuale' }]
    if (campi.fonte === 'auto') { p.ultimoControllo = adesso; p.statoUltimoControllo = 'ok' }
  }
  return p
}

/**
 * Un punto nella cronologia si scrive solo se il prezzo è cambiato.
 * Ritorna true se lo storico è stato toccato.
 */
export function registraPrezzo(prodotto, prezzo, fonte = 'auto', data = new Date().toISOString()) {
  if (typeof prezzo !== 'number' || !Number.isFinite(prezzo)) return false
  const ultimo = prodotto.storico[prodotto.storico.length - 1]
  if (ultimo && Math.abs(ultimo.prezzo - prezzo) < 0.005) return false
  prodotto.storico.push({ data, prezzo: Math.round(prezzo * 100) / 100, fonte })
  return true
}

export function prezzoAttuale(prodotto) {
  const ultimo = prodotto?.storico?.[prodotto.storico.length - 1]
  return ultimo ? ultimo.prezzo : null
}
