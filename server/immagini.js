/** Salvataggio delle immagini incollate o trascinate. Restano in dati/img/. */
import fsp from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { CARTELLA_IMG } from './archivio.js'

const TIPI = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
  'image/webp': 'webp', 'image/gif': 'gif'
}

/**
 * Accetta un data URL (data:image/png;base64,...) e lo scrive su disco.
 * Ritorna il percorso relativo da mettere nel JSON, o null se non è un'immagine.
 */
export async function salvaImmagine(dataUrl) {
  if (typeof dataUrl !== 'string') return null
  const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl.trim())
  if (!m) return null
  const estensione = TIPI[m[1].toLowerCase()]
  if (!estensione) return null
  const buffer = Buffer.from(m[2], 'base64')
  if (!buffer.length || buffer.length > 8 * 1024 * 1024) return null
  const nome = `${randomUUID()}.${estensione}`
  await fsp.mkdir(CARTELLA_IMG, { recursive: true })
  await fsp.writeFile(path.join(CARTELLA_IMG, nome), buffer)
  return `dati/img/${nome}`
}

export async function eliminaImmagine(relativo) {
  if (!relativo || !relativo.startsWith('dati/img/')) return
  try { await fsp.unlink(path.join(CARTELLA_IMG, path.basename(relativo))) } catch {}
}
